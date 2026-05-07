"""
Test compatibility of YOLOv8 + UNet + ResNet50 inside ViTCNNFoodClassifier
and run the full FoodAnalysisPipeline (chatbot) on the local test images,
measuring per-stage timing.

Run from Cal-AI directory:
    python scripts/test_vision_models_compat.py
"""

import asyncio
import os
import sys
import time
from pathlib import Path

CAL_AI_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(CAL_AI_ROOT))
os.chdir(CAL_AI_ROOT)

from PIL import Image  # noqa: E402

from config.settings import settings  # noqa: E402
from core.embedding.clip_service import CLIPService  # noqa: E402
from core.services.vision.vit_cnn_service import ViTCNNFoodClassifier  # noqa: E402
from core.pipelines.food_analysis_pipeline import FoodAnalysisPipeline  # noqa: E402


IMAGES_DIR = CAL_AI_ROOT / "data" / "storage" / "images"


def banner(title):
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def load_test_images():
    if not IMAGES_DIR.exists():
        raise SystemExit(f"Test images directory not found: {IMAGES_DIR}")

    files = sorted(p for p in IMAGES_DIR.iterdir()
                   if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not files:
        raise SystemExit(f"No test images in {IMAGES_DIR}")

    return files


def stage_test_classifier(classifier, image, filename):
    """Run YOLO, U-Net, ResNet50 stages in isolation and measure each."""
    timings = {}

    # YOLO
    t0 = time.perf_counter()
    yolo = classifier._detect_yolo(image)
    timings["yolo_seconds"] = round(time.perf_counter() - t0, 3)

    # UNet
    t0 = time.perf_counter()
    unet = classifier._segment_unet(image)
    timings["unet_seconds"] = round(time.perf_counter() - t0, 3)

    # Crop region
    cropped, crop_info = classifier._crop_food_region(image, yolo, unet)

    # ResNet50
    t0 = time.perf_counter()
    cnn = classifier._classify_cnn(cropped)
    timings["resnet50_seconds"] = round(time.perf_counter() - t0, 3)

    # Full classify (CLIP + scoring + Qdrant)
    t0 = time.perf_counter()
    full = classifier.classify(image, filename_hint=filename)
    timings["classify_total_seconds"] = round(time.perf_counter() - t0, 3)

    return {
        "filename": filename,
        "yolo": {
            "enabled": yolo.get("enabled"),
            "error": yolo.get("error"),
            "model": yolo.get("model"),
            "num_detections": len(yolo.get("detections") or []),
            "top_labels": [d.get("label") for d in (yolo.get("detections") or [])[:5]],
            "selected_region_label": (yolo.get("selected_region") or {}).get("label"),
        },
        "unet": {
            "enabled": unet.get("enabled"),
            "error": unet.get("error"),
            "mask_area_ratio": unet.get("mask_area_ratio"),
            "bbox": unet.get("bbox"),
        },
        "resnet50": {
            "enabled": cnn.get("enabled"),
            "error": cnn.get("error"),
            "top_predictions": cnn.get("top_predictions", [])[:3],
        },
        "crop_source": crop_info.get("source"),
        "top_predictions": full.get("top_predictions", [])[:3],
        "qdrant_hits": len(((full.get("qdrant_visual_analysis") or {})
                            .get("top_matches") or [])),
        "timings": timings,
    }


async def stage_test_pipeline(pipeline, image, filename, question):
    """Run the full pipeline (vision + RAG + LLM) and measure end-to-end time."""
    t0 = time.perf_counter()
    result = await pipeline.analyze(
        image=image, user_id=None, filename=filename, question=question
    )
    elapsed = time.perf_counter() - t0

    visual_matches = result.get("vision_detail", {}).get("visual_rag_matches") or []
    retrieved = result.get("retrieved_nutrition") or {}
    answer = result.get("answer") or ""

    return {
        "filename": filename,
        "dish_name": result.get("dish_name"),
        "confidence": result.get("confidence"),
        "nutrition_source": result.get("nutrition_source"),
        "rag_dataset_hit": bool(retrieved),
        "rag_matched_item": (retrieved.get("name") or retrieved.get("dish_name")
                             or retrieved.get("food_name")
                             or retrieved.get("recipe_title")),
        "visual_dataset_hits": len(visual_matches),
        "visual_top_match": (visual_matches[0].get("name") if visual_matches else None),
        "answer_length": len(answer),
        "answer_preview": (answer[:300] + "...") if len(answer) > 300 else answer,
        "warnings": result.get("warnings", []),
        "total_seconds": round(elapsed, 2),
    }


async def main():
    banner("ENV / SETTINGS")
    print(f"VISION_YOLO_ENABLED      = {settings.VISION_YOLO_ENABLED}")
    print(f"VISION_YOLO_MODEL        = {settings.VISION_YOLO_MODEL}")
    print(f"VISION_UNET_ENABLED      = {settings.VISION_UNET_ENABLED}")
    print(f"VISION_UNET_MODEL_PATH   = {settings.VISION_UNET_MODEL_PATH or '(empty)'}")
    print(f"IMAGE_CLASSIFIER_CNN_ENABLED = {settings.IMAGE_CLASSIFIER_CNN_ENABLED}")
    print(f"IMAGE_CLASSIFIER_CNN_MODEL   = {settings.IMAGE_CLASSIFIER_CNN_MODEL}")
    print(f"VISION_QDRANT_ENABLED        = {settings.VISION_QDRANT_ENABLED}")
    print(f"VISION_MODEL (Qwen-VL)       = {settings.VISION_MODEL}")
    print(f"LLM_MODEL                    = {settings.LLM_MODEL}")

    images = load_test_images()
    print(f"\n{len(images)} test image(s) found in {IMAGES_DIR}")

    banner("STAGE 1 — YOLO + UNet + ResNet50 compatibility")
    classifier = ViTCNNFoodClassifier(clip=CLIPService())

    classifier_results = []
    for path in images:
        with Image.open(path) as img:
            img.load()
            res = stage_test_classifier(classifier, img.convert("RGB"), path.name)
        classifier_results.append(res)
        t = res["timings"]
        print(
            f"\n[{path.name}]\n"
            f"  YOLO     ok={res['yolo']['enabled']!s:<5} "
            f"detections={res['yolo']['num_detections']} "
            f"labels={res['yolo']['top_labels']} time={t['yolo_seconds']}s"
        )
        if res["yolo"]["error"]:
            print(f"    error: {res['yolo']['error']}")
        print(
            f"  UNet     ok={res['unet']['enabled']!s:<5} "
            f"mask_area={res['unet']['mask_area_ratio']} "
            f"time={t['unet_seconds']}s"
        )
        if res["unet"]["error"]:
            print(f"    note: {res['unet']['error']}")
        print(
            f"  ResNet50 ok={res['resnet50']['enabled']!s:<5} "
            f"top={[p.get('label') for p in res['resnet50']['top_predictions']]} "
            f"time={t['resnet50_seconds']}s"
        )
        if res["resnet50"]["error"]:
            print(f"    error: {res['resnet50']['error']}")
        top = res["top_predictions"][0] if res["top_predictions"] else {}
        print(
            f"  Combined top-1: {top.get('name')} ({top.get('probability')}) | "
            f"qdrant_visual_hits={res['qdrant_hits']} | "
            f"classify_total={t['classify_total_seconds']}s"
        )

    banner("STAGE 2 — Full chatbot pipeline (vision + RAG + LLM)")
    pipeline = FoodAnalysisPipeline()
    pipeline_results = []

    questions = [
        "Đây là món gì? Cho tôi calo và protein ước tính.",
    ]
    for path in images:
        for q in questions:
            with Image.open(path) as img:
                img.load()
                res = await stage_test_pipeline(
                    pipeline, img.convert("RGB"), path.name, q
                )
            pipeline_results.append(res)
            print(
                f"\n[{path.name}] Q: {q}\n"
                f"  dish        = {res['dish_name']} (conf={res['confidence']})\n"
                f"  rag_used    = {res['rag_dataset_hit']} | "
                f"matched={res['rag_matched_item']!r} | "
                f"visual_hits={res['visual_dataset_hits']} "
                f"(top={res['visual_top_match']!r})\n"
                f"  source      = {res['nutrition_source']}\n"
                f"  total_time  = {res['total_seconds']}s | "
                f"answer_len  = {res['answer_length']}\n"
                f"  preview     = {res['answer_preview']!r}"
            )

    banner("SUMMARY")
    yolo_ok = all(r["yolo"]["enabled"] for r in classifier_results)
    unet_ok = all(r["unet"]["enabled"] for r in classifier_results)
    resnet_ok = all(r["resnet50"]["enabled"] for r in classifier_results)
    print(f"YOLO     compatible across all images: {yolo_ok}")
    print(f"UNet     compatible across all images: {unet_ok} "
          f"(disabled flag: {not settings.VISION_UNET_ENABLED})")
    print(f"ResNet50 compatible across all images: {resnet_ok}")

    rag_used = sum(1 for r in pipeline_results if r["rag_dataset_hit"])
    visual_used = sum(1 for r in pipeline_results if r["visual_dataset_hits"] > 0)
    avg_time = sum(r["total_seconds"] for r in pipeline_results) / max(1, len(pipeline_results))
    print(
        f"\nPipeline runs: {len(pipeline_results)} | "
        f"RAG dataset used: {rag_used}/{len(pipeline_results)} | "
        f"Visual dataset hits: {visual_used}/{len(pipeline_results)}"
    )
    print(f"Average chatbot total response time: {avg_time:.2f}s")
    times = [r["total_seconds"] for r in pipeline_results]
    if times:
        print(f"  min={min(times)}s  max={max(times)}s")


if __name__ == "__main__":
    asyncio.run(main())
