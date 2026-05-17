"""FoodCLIPDataset — yields (PIL.Image, caption_text) pairs from the
Epicurious recipe dataset (pes12017000148/food-ingredients-and-recipe-dataset-with-images).

Caption format mirrors `data/kaggle/ingest_food_ingredients_recipes.py::build_metadata_caption`
so that text/image pairs at training time match what the ingest pipeline
will use to build text-vector queries at inference time.
"""
from __future__ import annotations

import ast
import os
import re
from pathlib import Path
from typing import Optional

import pandas as pd
from PIL import Image
from torch.utils.data import Dataset

REQUIRED_COLUMNS = {"Title", "Cleaned_Ingredients", "Image_Name"}

IMAGE_ROOT = Path(__file__).resolve().parents[2] / "data" / "storage" / "images"


def _safe_str(value):
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except TypeError:
        pass
    return str(value).strip()


def _parse_list_field(value):
    text = _safe_str(value)
    if not text:
        return []
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, (list, tuple)):
            return [_safe_str(item) for item in parsed if _safe_str(item)]
    except Exception:
        pass
    return [item.strip(" -") for item in re.split(r"\s*[;,]\s*", text) if item.strip(" -")]


def _build_caption(title: str, ingredients: list[str]) -> str:
    title = _safe_str(title) or "unknown dish"
    top = [_safe_str(i) for i in ingredients[:5] if _safe_str(i)]
    if top:
        return f"Recipe image for {title}. Key ingredients: {', '.join(top)}."
    return f"Recipe image for {title}."


def _find_recipe_csv(dataset_path: str) -> str:
    for root, _, files in os.walk(dataset_path):
        for f in files:
            if not f.lower().endswith(".csv"):
                continue
            path = os.path.join(root, f)
            try:
                head = pd.read_csv(path, nrows=2)
            except Exception:
                continue
            cols = {c.strip() for c in head.columns}
            if REQUIRED_COLUMNS.issubset(cols):
                return path
    raise FileNotFoundError(f"No recipe CSV with {REQUIRED_COLUMNS} found under {dataset_path}")


def _build_image_index(dataset_path: str) -> dict[str, str]:
    index: dict[str, str] = {}
    extensions = {".jpg", ".jpeg", ".png", ".webp"}
    for root, _, files in os.walk(dataset_path):
        for filename in files:
            path = Path(root) / filename
            if path.suffix.lower() not in extensions:
                continue
            index[path.stem.lower()] = str(path)
            index[filename.lower()] = str(path)
    return index


def _resolve_image(index: dict[str, str], image_name: str) -> Optional[str]:
    image_name = _safe_str(image_name)
    if not image_name:
        return None
    key = image_name.lower()
    if key in index:
        return index[key]
    stem = Path(image_name).stem.lower()
    return index.get(stem)


class FoodCLIPDataset(Dataset):
    """torch Dataset of (PIL.Image[RGB], caption_str) pairs.

    Returns a tuple — caller is responsible for tokenizing / preprocessing
    via CLIPProcessor (kept out of __getitem__ so caller controls device
    placement and batch tokenization).
    """

    def __init__(self, dataset_path: str, max_rows: int | None = None):
        self.dataset_path = dataset_path
        csv_file = _find_recipe_csv(dataset_path)
        df = pd.read_csv(csv_file, encoding="utf-8", on_bad_lines="skip", low_memory=False)
        index = _build_image_index(dataset_path)

        rows = []
        skipped = 0
        for _, row in df.iterrows():
            image_name = _safe_str(row.get("Image_Name"))
            image_path = _resolve_image(index, image_name)
            if not image_path:
                skipped += 1
                continue
            title = _safe_str(row.get("Title"))
            ingredients = _parse_list_field(row.get("Cleaned_Ingredients") or row.get("Ingredients"))
            caption = _build_caption(title, ingredients)
            rows.append((image_path, caption))
            if max_rows and len(rows) >= max_rows:
                break

        self._rows = rows
        print(f"[FoodCLIPDataset] usable rows: {len(rows)} (skipped {skipped} missing-image)")

    def __len__(self) -> int:
        return len(self._rows)

    def __getitem__(self, idx: int):
        image_path, caption = self._rows[idx]
        image = Image.open(image_path).convert("RGB")
        return image, caption
