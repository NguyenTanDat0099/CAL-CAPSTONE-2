"""
Text-only ingest for pes12017000148/food-ingredients-and-recipe-dataset-with-images.

The multimodal (CLIP image + text) collection is handled by ingest_food_ingredients_recipes.py.
This script creates a lightweight text-768 companion collection for fast text-only retrieval.
Images are downloaded and their paths are stored in the payload for reference.
"""
import argparse
import ast
import os
import re
from pathlib import Path

import kagglehub
import pandas as pd

from core.embedding.text_embedding_service import TextEmbeddingService
from core.services.cache.embedding_cache import EmbeddingCache
from core.services.retrieval.qdrant_service import QdrantService
from data.kaggle.utils import find_all_csv_files, load_csv_safe


DATASET = "pes12017000148/food-ingredients-and-recipe-dataset-with-images"
COLLECTION = "food_recipe_images_text_768"
DOMAIN = "food_recipe_images"

REQUIRED_COLUMNS = {"Title", "Ingredients", "Instructions", "Image_Name", "Cleaned_Ingredients"}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def safe_str(value):
    if value is None:
        return ""
    try:
        if pd.isna(value):
            return ""
    except TypeError:
        pass
    return str(value).strip()


def parse_list_field(value):
    text = safe_str(value)
    if not text:
        return []
    try:
        parsed = ast.literal_eval(text)
        if isinstance(parsed, (list, tuple)):
            return [safe_str(item) for item in parsed if safe_str(item)]
    except Exception:
        pass
    return [item.strip(" -") for item in re.split(r"\s*[;,]\s*", text) if item.strip(" -")]


def build_image_index(dataset_path):
    image_index = {}
    for root, _, files in os.walk(dataset_path):
        for filename in files:
            path = Path(root) / filename
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            image_index[path.stem.lower()] = str(path)
            image_index[filename.lower()] = str(path)
    print(f"Indexed {len(image_index)} image lookup keys")
    return image_index


def resolve_image_path(image_index, image_name):
    image_name = safe_str(image_name)
    if not image_name:
        return None
    key = image_name.lower()
    if key in image_index:
        return image_index[key]
    stem = Path(image_name).stem.lower()
    return image_index.get(stem)


def find_recipe_csv(dataset_path):
    for csv_file in find_all_csv_files(dataset_path):
        try:
            sample = pd.read_csv(csv_file, nrows=2)
        except Exception:
            continue
        if REQUIRED_COLUMNS.issubset({col.strip() for col in sample.columns}):
            return csv_file
    raise ValueError("No CSV with required columns found in dataset.")


def build_payload(row, row_index, image_index, dataset_path):
    title = safe_str(row.get("Title"))
    image_name = safe_str(row.get("Image_Name"))
    ingredients_raw = safe_str(row.get("Ingredients"))
    cleaned_raw = safe_str(row.get("Cleaned_Ingredients"))
    instructions = safe_str(row.get("Instructions"))

    ingredients_list = parse_list_field(ingredients_raw)
    cleaned_list = parse_list_field(cleaned_raw) or ingredients_list

    image_path = resolve_image_path(image_index, image_name)
    image_ext = Path(image_path).suffix.lower().lstrip(".") if image_path else None

    return {
        "domain": DOMAIN,
        "dataset": DATASET,
        "collection": COLLECTION,
        "source_csv": "Food Ingredients and Recipe Dataset with Image Name Mapping.csv",
        "source_row": int(row_index),
        "title": title,
        "name": title,
        "dish_name": title,
        "recipe_name": title,
        "ingredients": ingredients_raw[:800] if ingredients_raw else None,
        "ingredients_list": ingredients_list,
        "cleaned_ingredients": cleaned_raw[:800] if cleaned_raw else None,
        "cleaned_ingredients_list": cleaned_list,
        "instructions": instructions[:1000] if instructions else None,
        "instructions_preview": instructions[:300] if instructions else None,
        "image_name": image_name,
        "image_path": image_path,
        "image_file": os.path.basename(image_path) if image_path else None,
        "image_extension": image_ext,
        "has_image": bool(image_path),
    }


def build_text(payload):
    parts = ["Dataset: Food Ingredients and Recipe Images"]

    if payload.get("title"):
        parts.append(f"Recipe: {payload['title']}")

    if payload.get("cleaned_ingredients_list"):
        top = ", ".join(payload["cleaned_ingredients_list"][:30])
        parts.append(f"Ingredients: {top}")
    elif payload.get("ingredients"):
        parts.append(f"Ingredients: {payload['ingredients'][:600]}")

    if payload.get("instructions"):
        parts.append(f"Instructions: {payload['instructions'][:400]}")

    if payload.get("image_name"):
        parts.append(f"Image: {payload['image_name']}")

    return " | ".join(parts)[:1400]


class NoopCache:
    def get(self, _k): return None
    def set(self, _k, _v): return None


def flush_pending(text_embed, cache, texts, payloads, batch):
    if not texts:
        return 0

    vectors = text_embed.embed_batch(texts)
    inserted = 0
    for text, payload, vector in zip(texts, payloads, vectors):
        if vector is None:
            continue
        cache.set(f"food_recipe_img_text:{text[:120]}", vector)
        batch.append({"vector": vector, "payload": payload})
        inserted += 1

    texts.clear()
    payloads.clear()
    return inserted


def run(
    collection=COLLECTION,
    embed_batch=64,
    upsert_batch=128,
    use_cache=False,
    limit=None,
    start_row=0,
):
    print("Ingest Food Ingredients + Recipe Images (text-768 companion)")
    print("Dataset:", DATASET)
    print("Collection:", collection)

    dataset_path = kagglehub.dataset_download(DATASET)
    print("Path to dataset files:", dataset_path)

    csv_file = find_recipe_csv(dataset_path)
    image_index = build_image_index(dataset_path)

    df = load_csv_safe(csv_file)
    if df is None:
        raise ValueError("Could not load recipe CSV.")

    if start_row:
        df = df.iloc[start_row:]
    if limit:
        df = df.head(limit)

    print(f"Rows to process: {len(df)}")

    qdrant = QdrantService()
    text_embed = TextEmbeddingService()
    cache = EmbeddingCache() if use_cache else NoopCache()

    texts = []
    payloads = []
    batch = []
    total = 0

    for row_index, row in df.iterrows():
        payload = build_payload(
            row=row,
            row_index=row_index,
            image_index=image_index,
            dataset_path=dataset_path,
        )
        text = build_text(payload)
        cached = cache.get(f"food_recipe_img_text:{text[:120]}")

        if cached:
            batch.append({"vector": cached, "payload": payload})
            total += 1
        else:
            texts.append(text)
            payloads.append(payload)

        if len(texts) >= embed_batch:
            total += flush_pending(text_embed, cache, texts, payloads, batch)

        if len(batch) >= upsert_batch:
            qdrant.upsert_generic(collection, batch)
            batch.clear()
            print(f"Inserted: {total}", flush=True)

    total += flush_pending(text_embed, cache, texts, payloads, batch)

    if batch:
        qdrant.upsert_generic(collection, batch)

    print(f"\nDONE ingest_food_recipe_images_text -> {total} records in {collection}")


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Ingest pes12017000148/food-ingredients-and-recipe-dataset-with-images "
            "as a text-768 collection (image paths stored in payload)."
        )
    )
    parser.add_argument("--collection", default=COLLECTION)
    parser.add_argument("--embed-batch", type=int, default=64)
    parser.add_argument("--upsert-batch", type=int, default=128)
    parser.add_argument("--use-cache", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--start-row", type=int, default=0)
    args = parser.parse_args()

    run(
        collection=args.collection,
        embed_batch=args.embed_batch,
        upsert_batch=args.upsert_batch,
        use_cache=args.use_cache,
        limit=args.limit,
        start_row=args.start_row,
    )


if __name__ == "__main__":
    main()
