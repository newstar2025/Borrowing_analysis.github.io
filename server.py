# -*- coding: utf-8 -*-
"""web2 独立服务 — 不修改原 web 系统。"""
from pathlib import Path
from flask import Flask, send_from_directory

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA = ROOT / "data"

app = Flask(__name__, static_folder=str(STATIC), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(STATIC, "index.html")


@app.get("/data/<path:filename>")
def data_files(filename: str):
    return send_from_directory(DATA, filename)


@app.get("/api/health")
def health():
    slim = DATA / "fact_slim.json"
    return {
        "ok": True,
        "system": "web2",
        "fact_slim": slim.exists(),
        "mb": round(slim.stat().st_size / 1024 / 1024, 2) if slim.exists() else 0,
    }


if __name__ == "__main__":
    print("图书借阅可视分析系统 web2 → http://127.0.0.1:8060")
    app.run(host="127.0.0.1", port=8060, debug=False)
