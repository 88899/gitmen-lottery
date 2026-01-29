"""
FastAPI 主入口
"""
import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from web.routers import history, predict, stats

app = FastAPI(
    title="彩票预测系统",
    description="支持双色球、大乐透、七星彩、七乐彩的历史查询和预测",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(history.router)
app.include_router(predict.router)
app.include_router(stats.router)

# 静态文件（如果需要）
# app.mount("/static", StaticFiles(directory="web/static"), name="static")

@app.get("/")
async def root():
    """首页"""
    return {
        "message": "彩票预测系统 API",
        "docs": "/docs",
        "history": "/history",
        "api": {
            "latest": "/latest/{type}",
            "predict": "/predict/{type}",
            "stats": "/stats/{type}",
            "history_api": "/api/history/{type}"
        },
        "supported_types": ["ssq", "dlt", "qxc", "qlc"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
