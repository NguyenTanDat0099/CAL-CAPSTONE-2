"""LoRA fine-tune CLIP-ViT-B/32 vision tower on the Epicurious recipe dataset.

Run from Cal-AI/ with venv-train (ROCm 6.1):
    HSA_OVERRIDE_GFX_VERSION=10.3.0 HIP_VISIBLE_DEVICES=0 \\
        ./venv-train/bin/python -m training.train_clip_lora \\
        --dataset-path /home/tarou/.cache/kagglehub/datasets/pes12017000148/food-ingredients-and-recipe-dataset-with-images/versions/1 \\
        --output models/clip-food-lora --epochs 3 --batch-size 32 --lr 1e-4

Vision tower only — text tower stays frozen, which keeps the embedding
space anchored (so existing 768-D text indexes & captions stay consistent).
"""
from __future__ import annotations

import argparse
import math
import os
import sys
import time
from pathlib import Path
from typing import Iterable

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from data.dataset.clip_dataset import FoodCLIPDataset


def _collate(batch: Iterable[tuple]):
    images, captions = zip(*batch)
    return list(images), list(captions)


def _save_adapter(model, processor, output_dir: str, base_model_id: str, step: int | None = None):
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out)
    processor.save_pretrained(out)
    (out / "BASE_MODEL").write_text(base_model_id + "\n")
    print(f"[save] adapter -> {out} (step={step})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-path", required=True)
    parser.add_argument("--output", default="models/clip-food-lora")
    parser.add_argument("--base-model", default="openai/clip-vit-base-patch32")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--max-rows", type=int, default=None, help="cap dataset rows for smoke tests")
    parser.add_argument("--max-steps", type=int, default=None, help="cap total steps for smoke tests")
    parser.add_argument("--save-every", type=int, default=500)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if torch.cuda.is_available():
        print(f"[env] device={device} name={torch.cuda.get_device_name(0)}")
    else:
        print("[env] CUDA/ROCm NOT available — falling back to CPU (very slow)")

    from transformers import CLIPModel, CLIPProcessor
    from peft import LoraConfig, get_peft_model

    print(f"[load] base model: {args.base_model}")
    processor = CLIPProcessor.from_pretrained(args.base_model)
    model = CLIPModel.from_pretrained(args.base_model)

    # Freeze everything; LoRA injection in vision tower only.
    for p in model.parameters():
        p.requires_grad = False

    lora_cfg = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "out_proj"],
        bias="none",
    )
    # Apply LoRA only to the vision tower; pass it through PEFT and reattach.
    model.vision_model = get_peft_model(model.vision_model, lora_cfg)
    model.vision_model.print_trainable_parameters()

    # Trainable: LoRA adapters + visual_projection (small linear, 768->512)
    for p in model.visual_projection.parameters():
        p.requires_grad = True

    trainable = [p for p in model.parameters() if p.requires_grad]
    n_train = sum(p.numel() for p in trainable)
    print(f"[lora] trainable params: {n_train:,}")

    model.to(device)
    model.train()

    print(f"[data] loading dataset from {args.dataset_path}")
    dataset = FoodCLIPDataset(args.dataset_path, max_rows=args.max_rows)
    if len(dataset) == 0:
        print("[data] empty dataset, abort")
        sys.exit(1)
    loader = DataLoader(
        dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        collate_fn=_collate,
        drop_last=True,
        pin_memory=(device.type == "cuda"),
    )

    optimizer = torch.optim.AdamW(trainable, lr=args.lr)
    total_steps = args.max_steps or (args.epochs * len(loader))
    print(f"[plan] {args.epochs} epochs × {len(loader)} steps/epoch -> total ~{total_steps}")

    # logit scale (CLIP's learnable temperature) — kept frozen at base value
    logit_scale = model.logit_scale.exp().detach()

    step = 0
    t0 = time.time()
    for epoch in range(args.epochs):
        for images, captions in loader:
            inputs = processor(
                text=captions,
                images=images,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77,
            ).to(device)

            outputs = model(
                pixel_values=inputs["pixel_values"],
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
            )
            image_embeds = F.normalize(outputs.image_embeds, dim=-1)
            text_embeds = F.normalize(outputs.text_embeds, dim=-1)

            logits = image_embeds @ text_embeds.T * logit_scale
            labels = torch.arange(logits.size(0), device=device)
            loss = (F.cross_entropy(logits, labels) + F.cross_entropy(logits.T, labels)) / 2

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            step += 1
            if step % 10 == 0 or step == 1:
                elapsed = time.time() - t0
                rate = step / max(elapsed, 1e-6)
                eta = (total_steps - step) / max(rate, 1e-6)
                print(f"  step {step}/{total_steps} epoch {epoch} loss {loss.item():.4f} ({rate:.2f} step/s, eta {eta/60:.1f}min)")

            if args.save_every and step % args.save_every == 0:
                _save_adapter(model.vision_model, processor, args.output, args.base_model, step=step)

            if args.max_steps and step >= args.max_steps:
                break
        if args.max_steps and step >= args.max_steps:
            break

    _save_adapter(model.vision_model, processor, args.output, args.base_model, step=step)
    print(f"[done] total_steps={step} elapsed={(time.time()-t0)/60:.1f}min")


if __name__ == "__main__":
    main()
