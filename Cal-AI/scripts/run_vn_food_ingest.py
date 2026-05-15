#!/usr/bin/env python3
"""
Run Vietnamese food dataset ingestion into Qdrant.

Usage (from Cal-AI/ directory):
    python scripts/run_vn_food_ingest.py

Collection created: vn_food_vectors_768 (768-dim, cosine)
Source CSV:         backend/data/dataFoodVietNam.csv
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.kaggle.ingest_vn_food import run

if __name__ == "__main__":
    run()
