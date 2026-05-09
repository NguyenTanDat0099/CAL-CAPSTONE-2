"""Walk every Qdrant collection, print summary + 1 sample payload."""
import os
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from qdrant_client import QdrantClient

QDRANT_URL = os.environ["QDRANT_URL"]
QDRANT_API_KEY = os.environ["QDRANT_API_KEY"]

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)
collections = client.get_collections().collections
names = sorted(c.name for c in collections)

print(f"TOTAL COLLECTIONS: {len(names)}")
print("=" * 100)

KEYS_PRIORITY = [
    "name", "title", "dish_name", "recipe_name", "food_name",
    "ingredients_preview", "ingredients", "image_path", "image_name",
    "image_file", "has_image", "calories", "calories_per_100g",
    "domain", "source_dataset", "dataset", "category", "type",
    "description", "instructions_preview"
]

for name in names:
    try:
        info = client.get_collection(name)
        count = client.count(name, exact=False).count
    except Exception as e:
        print(f"\n## {name}\n  !! error: {e}")
        continue

    cfg = info.config.params.vectors
    if hasattr(cfg, "size"):
        vec_desc = f"single({cfg.size}D, {cfg.distance.name})"
    else:
        parts = [f"{k}({v.size}D)" for k, v in cfg.items()]
        vec_desc = "named:" + ", ".join(parts)

    print(f"\n## {name}")
    print(f"  count={count}  vectors={vec_desc}")

    try:
        sample, _ = client.scroll(name, limit=1, with_payload=True, with_vectors=False)
        if sample:
            payload = sample[0].payload or {}
            shown = {}
            for k in KEYS_PRIORITY:
                if k in payload and payload[k] not in (None, "", []):
                    v = payload[k]
                    if isinstance(v, str) and len(v) > 120:
                        v = v[:120] + "..."
                    shown[k] = v
            other_keys = [k for k in payload.keys() if k not in shown][:8]
            print(f"  payload-keys-all: {sorted(payload.keys())[:25]}")
            print(f"  sample: {json.dumps(shown, ensure_ascii=False, default=str)[:500]}")
        else:
            print("  (empty)")
    except Exception as e:
        print(f"  scroll error: {e}")
