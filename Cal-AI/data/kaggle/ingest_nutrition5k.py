import argparse
import math
import re
from pathlib import Path

import kagglehub

from core.embedding.text_embedding_service import TextEmbeddingService
from core.services.cache.embedding_cache import EmbeddingCache
from core.services.retrieval.qdrant_service import QdrantService
from data.kaggle.utils import find_all_csv_files, load_csv_safe


DATASET = "gillesokhin/nutrition5k-dataset"
COLLECTION = "nutrition5k_vectors_768"
DOMAIN = "nutrition5k"

CSV_TABLES = {
    "dish_ingredients.csv": "dish_ingredients",
    "dish_nutrition_values.csv": "dish_nutrition_values",
    "ingredients_metadata.csv": "ingredients_metadata",
}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
NUTRITION_ALIASES = {
    "calories": ("calories", "calorie", "kcal", "energy"),
    "mass_g": ("mass", "mass_g", "grams", "gram", "weight", "weight_g"),
    "fat_g": ("fat", "fat_g", "total_fat"),
    "carbs_g": ("carbs", "carb", "carbohydrates", "carbohydrate", "carbs_g"),
    "protein_g": ("protein", "protein_g"),
}


class NoopCache:
    def get(self, _key):
        return None

    def set(self, _key, _value):
        return None


def clean_value(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if hasattr(value, "item"):
        return clean_value(value.item())
    if isinstance(value, str):
        value = value.strip()
        return value if value and value.lower() != "nan" else None
    return value


def clean_dict(row):
    return {str(key): clean_value(value) for key, value in row.items()}


def normalized_key(key):
    return re.sub(r"[^a-z0-9]+", "_", str(key).strip().lower()).strip("_")


def first_present(row, names):
    normalized = {normalized_key(key): key for key in row}
    for name in names:
        key = normalized.get(normalized_key(name))
        if key is not None:
            value = clean_value(row.get(key))
            if value is not None:
                return value
    return None


def pick_id(row, *candidates):
    value = first_present(row, candidates)
    return str(value) if value is not None else None


def build_nutrition(row):
    nutrition = {}
    for label, aliases in NUTRITION_ALIASES.items():
        value = first_present(row, aliases)
        if value is not None:
            nutrition[label] = value
    return nutrition


def table_for_file(file_path):
    name = Path(file_path).name.lower()
    return CSV_TABLES.get(name, Path(file_path).stem)


def record_type_for_table(table):
    if table == "dish_ingredients":
        return "dish_ingredient"
    if table == "dish_nutrition_values":
        return "dish_nutrition"
    if table == "ingredients_metadata":
        return "ingredient_metadata"
    return "csv_row"


def index_imagery(dataset_path, sample_limit=5):
    imagery_root = Path(dataset_path) / "imagery"
    index = {}

    if not imagery_root.exists():
        return index

    image_sources = {
        "realsense_overhead": imagery_root / "realsense_overhead",
        "side_angles": imagery_root / "side_angles",
    }

    for label, root in image_sources.items():
        if not root.exists():
            continue

        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue

            match = re.search(r"dish_\d+", str(path))
            if not match:
                continue

            dish_id = match.group(0)
            dish_images = index.setdefault(dish_id, {})
            info = dish_images.setdefault(label, {"count": 0, "samples": []})
            info["count"] += 1
            if len(info["samples"]) < sample_limit:
                info["samples"].append(str(path))

    return index


def build_payload(row, table, file_path, row_index, image_index):
    raw = clean_dict(row)
    dish_id = pick_id(raw, "dish_id", "dish", "id")
    ingredient_id = pick_id(raw, "ingredient_id", "ingr_id", "ingredient", "ingredient id")
    ingredient_name = first_present(raw, ("ingredient_name", "name", "ingredient", "ingr_name"))
    nutrition = build_nutrition(raw)

    payload = {
        "domain": DOMAIN,
        "dataset": DATASET,
        "collection": COLLECTION,
        "source_table": table,
        "record_type": record_type_for_table(table),
        "source_csv": str(file_path),
        "source_csv_name": Path(file_path).name,
        "row_index": int(row_index),
        "raw": raw,
    }

    if dish_id:
        payload["dish_id"] = dish_id
        payload["image_summary"] = image_index.get(dish_id, {})
    if ingredient_id:
        payload["ingredient_id"] = ingredient_id
    if ingredient_name:
        payload["ingredient_name"] = ingredient_name
    if nutrition:
        payload["nutrition"] = nutrition
        for key, value in nutrition.items():
            if key == "calories":
                payload["calories"] = value

    return payload


def build_text(payload):
    parts = [
        "Dataset: Nutrition5k",
        f"Table: {payload['source_table']}",
        f"Record type: {payload['record_type']}",
    ]

    if payload.get("dish_id"):
        parts.append(f"Dish ID: {payload['dish_id']}")
    if payload.get("ingredient_id"):
        parts.append(f"Ingredient ID: {payload['ingredient_id']}")
    if payload.get("ingredient_name"):
        parts.append(f"Ingredient: {payload['ingredient_name']}")
    if payload.get("nutrition"):
        parts.append(
            "Nutrition: "
            + ", ".join(f"{key}={value}" for key, value in payload["nutrition"].items())
        )

    for key, value in payload["raw"].items():
        if value is not None:
            parts.append(f"{key}: {value}")

    return " | ".join(parts)[:1200]


def flush_pending(text_embed, cache, texts, payloads, batch):
    if not texts:
        return 0

    vectors = text_embed.embed_batch(texts)
    inserted = 0

    for text, payload, vector in zip(texts, payloads, vectors):
        if vector is None:
            continue
        cache.set(f"nutrition5k:mpnet768:{text}", vector)
        batch.append({"vector": vector, "payload": payload})
        inserted += 1

    texts.clear()
    payloads.clear()

    return inserted


def download_csv_files(full_dataset=False):
    if full_dataset:
        dataset_path = kagglehub.dataset_download(DATASET)
        csv_files = find_all_csv_files(dataset_path)
        selected_files = [
            file_path for file_path in csv_files
            if Path(file_path).name.lower() in CSV_TABLES
        ] or csv_files
        return dataset_path, selected_files

    selected_files = []
    dataset_path = None

    for csv_name in CSV_TABLES:
        file_path = kagglehub.dataset_download(DATASET, path=csv_name)
        selected_files.append(file_path)
        dataset_path = str(Path(file_path).parent)

    return dataset_path or "", selected_files


def run(
    collection=COLLECTION,
    skip_image_index=True,
    embed_batch=64,
    upsert_batch=128,
    full_dataset=False,
    use_cache=False,
):
    print("🚀 ingest_nutrition5k (768 model)")
    print("Dataset:", DATASET)
    print("Collection:", collection)

    dataset_path, selected_files = download_csv_files(full_dataset=full_dataset)
    print("Path to dataset files:", dataset_path)

    if not selected_files:
        raise ValueError("No CSV files found in Nutrition5k dataset")

    image_index = {} if skip_image_index else index_imagery(dataset_path)
    if image_index:
        print(f"🖼️ Indexed imagery for {len(image_index)} dishes")

    qdrant = QdrantService()
    text_embed = TextEmbeddingService()
    cache = EmbeddingCache() if use_cache else NoopCache()

    texts = []
    payloads = []
    batch = []
    total = 0

    for file_path in selected_files:
        table = table_for_file(file_path)
        print(f"\n📂 Processing table={table}: {file_path}")

        df = load_csv_safe(file_path)
        if df is None:
            continue

        for row_index, row in df.iterrows():
            payload = build_payload(
                row=row.to_dict(),
                table=table,
                file_path=file_path,
                row_index=row_index,
                image_index=image_index,
            )
            text = build_text(payload)
            cached = cache.get(f"nutrition5k:mpnet768:{text}")

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
                print(f"✅ Inserted: {total}", flush=True)

    total += flush_pending(text_embed, cache, texts, payloads, batch)

    if batch:
        qdrant.upsert_generic(collection, batch)

    print(f"\n🎯 DONE ingest_nutrition5k → {total} records")


def main():
    parser = argparse.ArgumentParser(
        description="Download Nutrition5k CSV files and ingest every row into a new Qdrant collection."
    )
    parser.add_argument("--collection", default=COLLECTION)
    parser.add_argument(
        "--full-dataset",
        action="store_true",
        help="Download the full 21GB dataset package. Default downloads only the three CSV files.",
    )
    parser.add_argument(
        "--with-image-index",
        action="store_true",
        help="Scan imagery folders and add image counts/samples to dish payloads. Requires --full-dataset.",
    )
    parser.add_argument("--embed-batch", type=int, default=64)
    parser.add_argument("--upsert-batch", type=int, default=128)
    parser.add_argument(
        "--use-cache",
        action="store_true",
        help="Use Redis embedding cache. Default is off to avoid one network read per CSV row.",
    )
    args = parser.parse_args()

    run(
        collection=args.collection,
        skip_image_index=not args.with_image_index,
        embed_batch=args.embed_batch,
        upsert_batch=args.upsert_batch,
        full_dataset=args.full_dataset,
        use_cache=args.use_cache,
    )


if __name__ == "__main__":
    main()
