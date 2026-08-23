# -*- coding: utf-8 -*-
"""为 web2 导出精简列式 JSON（只读 fact_loan，不改原 web）。"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(r"d:\Z_ST")
SRC = ROOT / "data" / "fact_loan.parquet"
OUT = ROOT / "web2" / "data" / "fact_slim.json"


def encode(s: pd.Series) -> dict:
    vals = s.where(s.notna(), None).tolist()
    uniq, index, codes = [], {}, []
    for v in vals:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            codes.append(-1)
            continue
        key = str(v)
        if key not in index:
            index[key] = len(uniq)
            uniq.append(v)
        codes.append(index[key])
    return {"dict": uniq, "codes": codes}


def main():
    df = pd.read_parquet(SRC)
    df["loan_date"] = pd.to_datetime(df["loan_date"]).dt.strftime("%Y-%m-%d")
    df["title"] = df["title"].astype(str).str.slice(0, 50)
    df["author"] = df["author"].fillna("").astype(str).str.slice(0, 36)
    df["publisher"] = df["publisher"].fillna("").astype(str).str.slice(0, 28)

    payload = {
        "n": int(len(df)),
        "date": df["loan_date"].tolist(),
        "hour": df["loan_hour"].astype(int).tolist(),
        "dow": df["loan_dow"].astype(int).tolist(),
        "month": df["loan_month"].astype(int).tolist(),
        "lib": encode(df["library_name"]),
        "region": encode(df["lib_region"]),
        "lib_type": encode(df["lib_type"]),
        "item_type": encode(df["item_type"]),
        "clc": encode(df["clc_major"]),
        "title": encode(df["title"]),
        "author": encode(df["author"]),
        "publisher": encode(df["publisher"]),
        "pub_year": df["pub_year"].fillna(-1).astype(int).tolist(),
        "peri": df["is_periodical"].fillna(False).astype(int).tolist(),
        "rid": df["reader_id"].astype(int).tolist(),
        "age_band": encode(df["age_band"]),
        "gender": encode(df["gender"]),
        "age_outlier": df["flag_age_outlier"].fillna(False).astype(int).tolist(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT} ({OUT.stat().st_size/1024/1024:.2f} MB)")


if __name__ == "__main__":
    main()
