#!/usr/bin/env python3
"""
Run Cooky.vn Vietnamese recipes ingestion into Qdrant.

Usage (from Cal-AI/ directory):
    python scripts/run_cooky_ingest.py

Collection created: cooky_recipes_768 (768-dim, cosine)
Source CSV:         Cal-AI/data/dataset/food_dataset_cookyweb.csv
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.kaggle.ingest_cooky_recipes import run

if __name__ == "__main__":
    run()
