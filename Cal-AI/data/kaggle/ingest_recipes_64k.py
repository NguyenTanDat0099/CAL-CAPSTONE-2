import argparse
import math
import re
from pathlib import Path

import kagglehub

from core.embedding.text_embedding_service import TextEmbeddingService
from core.services.cache.embedding_cache import EmbeddingCache
from core.services.retrieval.qdrant_service import QdrantService
from data.kaggle.utils import find_all_csv_files, load_csv_safe


DATASET = "prashantsingh001/recipes-dataset-64k-dishes"
COLLECTION = "recipes_64k_vectors_768"
DOMAIN = "recipe_64k"

TITLE_ALIASES = ("recipename", "recipe_name", "title", "name", "dish", "dish_name", "food")
INGREDIENT_ALIASES = ("ingredients", "ingredient", "ingredientslist", "ingredients_list", "ingredient_list")
INSTRUCTION_ALIASES = ("instructions", "instruction", "directions", "direction", "steps", "method", "procedure")
CATEGORY_ALIASES = ("category", "cuisine", "course", "type", "diet", "diet_type", "recipecategory", "recipe_category")
CUISINE_ALIASES = ("cuisine", "cuisine_type", "region", "country", "origin")
TIME_ALIASES = ("totaltime", "total_time", "preptime", "prep_time", "cooktime", "cook_time", "time")
IMAGE_ALIASES = ("image", "image_url", "imageurl", "img", "img_url", "photo", "picture", "thumbnail")


def clean_value(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if hasattr(value, "item"):
        return clean_value(value.item())
    if isinstance(value, str):
        value = value.strip()
        return value if value and value.lower() not in ("nan", "none", "null", "") else None
    return value


def clean_dict(row):
    return {str(key): clean_value(value) for key, value in row.items()}


def normalized_key(key):
    return re.sub(r"[^a-z0-9]+", "", str(key).strip().lower())


def first_present(row, aliases):
    normalized = {normalized_key(k): k for k in row}
    for alias in aliases:
        key = normalized.get(normalized_key(alias))
        if key is not None:
            value = clean_value(row.get(key))
            if value is not None:
                return value
    return None


def truncate(text, limit=500):
    if not text:
        return None
    text = str(text).strip()
    return text[:limit] if len(text) > limit else text


def build_payload(row, file_path, row_index):
    raw = clean_dict(row)

    title = first_present(raw, TITLE_ALIASES)
    ingredients = first_present(raw, INGREDIENT_ALIASES)
    instructions = first_present(raw, INSTRUCTION_ALIASES)
    category = first_present(raw, CATEGORY_ALIASES)
    cuisine = first_present(raw, CUISINE_ALIASES)
    image_url = first_present(raw, IMAGE_ALIASES)
    cook_time = first_present(raw, TIME_ALIASES)

    payload = {
        "domain": DOMAIN,
        "dataset": DATASET,
        "collection": COLLECTION,
        "source_csv": str(file_path),
        "source_csv_name": Path(file_path).name,
        "row_index": int(row_index),
    }

    if title:
        payload["title"] = title
        payload["name"] = title
        payload["dish_name"] = title
        payload["recipe_name"] = title
    if ingredients:
        payload["ingredients"] = truncate(ingredients, 800)
    if instructions:
        payload["instructions"] = truncate(instructions, 1000)
        payload["instructions_preview"] = truncate(instructions, 300)
    if category:
        payload["category"] = category
    if cuisine:
        payload["cuisine"] = cuisine
    if image_url:
        payload["image_url"] = image_url
        payload["has_image"] = True
    if cook_time:
        payload["cook_time"] = cook_time

    # preserve remaining raw fields (truncated)
    for key, value in raw.items():
        if key not in payload and value is not None:
            payload[key] = truncate(str(value), 200) if isinstance(value, str) else value

    return payload


def build_text(payload):
    parts = ["Dataset: Recipes 64K Dishes"]

    if payload.get("title"):
        parts.append(f"Recipe: {payload['title']}")
    if payload.get("category"):
        parts.append(f"Category: {payload['category']}")
    if payload.get("cuisine"):
        parts.append(f"Cuisine: {payload['cuisine']}")
    if payload.get("ingredients"):
        parts.append(f"Ingredients: {payload['ingredients'][:600]}")
    if payload.get("instructions"):
        parts.append(f"Instructions: {payload['instructions'][:400]}")
    if payload.get("cook_time"):
        parts.append(f"Time: {payload['cook_time']}")

    return " | ".join(parts)[:1400]


def flush_pending(text_embed, cache, texts, payloads, batch, cache_prefix):
    if not texts:
        return 0

    vectors = text_embed.embed_batch(texts)
    inserted = 0

    for text, payload, vector in zip(texts, payloads, vectors):
        if vector is None:
            continue
        cache.set(f"{cache_prefix}:{text[:120]}", vector)
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
):
    print("Ingest Recipes 64K Dishes (768-dim text)")
    print("Dataset:", DATASET)
    print("Collection:", collection)

    dataset_path = kagglehub.dataset_download(DATASET)
    print("Path to dataset files:", dataset_path)

    csv_files = find_all_csv_files(dataset_path)
    if not csv_files:
        raise ValueError("No CSV files found in recipes-dataset-64k-dishes")

    qdrant = QdrantService()
    text_embed = TextEmbeddingService()

    class NoopCache:
        def get(self, _k): return None
        def set(self, _k, _v): return None

    cache = EmbeddingCache() if use_cache else NoopCache()
    cache_prefix = "recipes64k:mpnet768"

    texts = []
    payloads = []
    batch = []
    total = 0

    for file_path in csv_files:
        print(f"\nProcessing: {file_path}")
        df = load_csv_safe(file_path)
        if df is None:
            continue

        print(f"Rows: {len(df)}")

        for row_index, row in df.iterrows():
            if limit and total >= limit:
                break

            payload = build_payload(
                row=row.to_dict(),
                file_path=file_path,
                row_index=row_index,
            )
            text = build_text(payload)
            cache_key = f"{cache_prefix}:{text[:120]}"
            cached = cache.get(cache_key)

            if cached:
                batch.append({"vector": cached, "payload": payload})
                total += 1
            else:
                texts.append(text)
                payloads.append(payload)

            if len(texts) >= embed_batch:
                total += flush_pending(text_embed, cache, texts, payloads, batch, cache_prefix)

            if len(batch) >= upsert_batch:
                qdrant.upsert_generic(collection, batch)
                batch.clear()
                print(f"Inserted: {total}", flush=True)

        if limit and total >= limit:
            break

    total += flush_pending(text_embed, cache, texts, payloads, batch, cache_prefix)

    if batch:
        qdrant.upsert_generic(collection, batch)

    print(f"\nDONE ingest_recipes_64k -> {total} records in {collection}")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest prashantsingh001/recipes-dataset-64k-dishes into Qdrant."
    )
    parser.add_argument("--collection", default=COLLECTION)
    parser.add_argument("--embed-batch", type=int, default=64)
    parser.add_argument("--upsert-batch", type=int, default=128)
    parser.add_argument("--use-cache", action="store_true")
    parser.add_argument("--limit", type=int, default=None, help="Max records to ingest (for testing).")
    args = parser.parse_args()

    run(
        collection=args.collection,
        embed_batch=args.embed_batch,
        upsert_batch=args.upsert_batch,
        use_cache=args.use_cache,
        limit=args.limit,
    )


if __name__ == "__main__":
    main()
