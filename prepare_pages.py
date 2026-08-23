# -*- coding: utf-8 -*-
"""生成 GitHub Pages 用的 docs/ 目录（静态站 + 数据）。"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA = ROOT / "data"
DOCS = ROOT / "docs"
DATA_FILES = ["fact_slim.json", "holidays.json"]


def main() -> None:
    if DOCS.exists():
        shutil.rmtree(DOCS)
    DOCS.mkdir(parents=True)

    for item in STATIC.iterdir():
        dest = DOCS / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    data_out = DOCS / "data"
    data_out.mkdir()
    for name in DATA_FILES:
        src = DATA / name
        if not src.exists():
            raise FileNotFoundError(f"缺少数据文件: {src}")
        shutil.copy2(src, data_out / name)

    mb = sum(f.stat().st_size for f in DOCS.rglob("*") if f.is_file()) / 1024 / 1024
    print(f"已生成 {DOCS}（约 {mb:.2f} MB）")
    print("下一步: git add docs && git commit && git push")


if __name__ == "__main__":
    main()
