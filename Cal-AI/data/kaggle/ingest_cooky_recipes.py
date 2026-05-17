import csv
import pathlib

from core.services.retrieval.qdrant_service import QdrantService
from core.services.cache.embedding_cache import EmbeddingCache
from core.services.cache.dedup_service import DedupService
from core.embedding.text_embedding_service import TextEmbeddingService

_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
CSV_PATH = _REPO_ROOT / "Cal-AI" / "data" / "dataset" / "food_dataset_cookyweb.csv"

COLLECTION = "cooky_recipes_768"
DOMAIN = "recipe"
SOURCE = "cookyweb"
LANGUAGE = "vi"

EMBED_BATCH = 64
UPSERT_BATCH = 64

_COL_MAP = {
    "STT":            ("stt",          "int"),
    "Tên món":        ("food_name",    "str"),
    "Giới thiệu":     ("intro",        "str"),
    "Loại món":       ("category",     "str"),
    "Khẩu phần":      ("servings",     "str"),
    "Time Cooking":   ("time_cooking", "int"),
    "Nguyên liệu":    ("ingredients",  "str"),
    "Cách làm":       ("instructions", "str"),
    "Tags":           ("tags",         "str"),
    "Calories":       ("calories",     "float"),
    "Fat Amount":     ("fat",          "float"),
    "Fiber Amount":   ("fiber",        "float"),
    "Sugar Amount":   ("sugar",        "float"),
    "Protein Amount": ("protein",      "float"),
    "Link Ảnh":       ("image_url",    "str"),
}


def _to_number(raw: str, as_int: bool = False):
    cleaned = (raw or "").strip().replace(",", ".")
    cleaned = "".join(c for c in cleaned if c in "0123456789.-")
    if not cleaned or cleaned in {".", "-", "-."}:
        return 0 if as_int else 0.0
    try:
        val = float(cleaned)
        return int(val) if as_int else val
    except ValueError:
        return 0 if as_int else 0.0


def _load_csv():
    rows = []
    with open(CSV_PATH, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            record: dict = {}
            for csv_col, (field, kind) in _COL_MAP.items():
                val = (raw.get(csv_col) or "").strip()
                if kind == "int":
                    record[field] = _to_number(val, as_int=True)
                elif kind == "float":
                    record[field] = _to_number(val, as_int=False)
                else:
                    record[field] = val
            record["domain"] = DOMAIN
            record["source"] = SOURCE
            record["language"] = LANGUAGE
            rows.append(record)
    return rows


def _build_text(r: dict) -> str:
    parts = [r["food_name"]]
    if r.get("category"):
        parts.append(f"Loại: {r['category']}")
    if r.get("tags"):
        parts.append(f"Tags: {r['tags']}")
    if r.get("servings"):
        parts.append(f"Khẩu phần: {r['servings']}")
    if r.get("intro"):
        parts.append(f"Mô tả: {r['intro'][:200]}")
    if r.get("ingredients"):
        parts.append(f"Nguyên liệu: {r['ingredients'][:300]}")
    if r.get("instructions"):
        parts.append(f"Cách làm: {r['instructions'][:400]}")
    if r.get("calories"):
        parts.append(f"Calo: {r['calories']} kcal")
    parts.append("nguồn: cooky.vn")
    return " | ".join(parts)[:400]


def run():
    print("🚀 ingest_cooky_recipes — Cooky.vn Vietnamese Recipes (768-dim)")
    print(f"📂 CSV: {CSV_PATH}")

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    records = _load_csv()
    print(f"📊 Loaded {len(records)} rows")

    qdrant = QdrantService()
    text_embed = TextEmbeddingService()
    cache = EmbeddingCache()
    dedup = DedupService()

    batch: list[dict] = []
    texts: list[str] = []
    payloads: list[dict] = []
    total = 0

    for record in records:
        if not record.get("food_name"):
            continue

        if dedup.is_duplicate(record):
            continue

        text = _build_text(record)
        cache_key = f"mpnet768:cooky:{text}"
        cached = cache.get(cache_key)

        if cached:
            batch.append({"vector": cached, "payload": record})
            total += 1
        else:
            texts.append(text)
            payloads.append(record)

        if len(texts) >= EMBED_BATCH:
            vectors = text_embed.embed_batch(texts)
            for t, p, v in zip(texts, payloads, vectors):
                if v is None:
                    continue
                cache.set(f"mpnet768:cooky:{t}", v)
                batch.append({"vector": v, "payload": p})
                total += 1
            texts.clear()
            payloads.clear()

        if len(batch) >= UPSERT_BATCH:
            qdrant.upsert_generic(COLLECTION, batch)
            print(f"  ✅ Upserted: {total}")
            batch.clear()

    if texts:
        vectors = text_embed.embed_batch(texts)
        for t, p, v in zip(texts, payloads, vectors):
            if v is None:
                continue
            cache.set(f"mpnet768:cooky:{t}", v)
            batch.append({"vector": v, "payload": p})
            total += 1

    if batch:
        qdrant.upsert_generic(COLLECTION, batch)

    print(f"\n🎯 DONE ingest_cooky_recipes → {total} records in '{COLLECTION}'")


if __name__ == "__main__":
    run()
