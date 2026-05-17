#!/usr/bin/env python3
"""
Run MonNgonMoiNgay.com Vietnamese recipes ingestion into Qdrant.

Usage (from Cal-AI/ directory):
    python scripts/run_mnmn_ingest.py

Collection created: mnmn_recipes_768 (768-dim, cosine)
Source CSV:         Cal-AI/data/dataset/food_dataset_mnmnweb.csv
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.kaggle.ingest_mnmn_recipes import run

if __name__ == "__main__":
    run()
