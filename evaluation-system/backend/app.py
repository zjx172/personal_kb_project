"""
评估系统 FastAPI 应用主文件
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()],
)

# 创建 FastAPI 应用
app = FastAPI(
    title="RAG Evaluation System",
    description="RAG 评估跟踪系统 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# 注册路由
from routers import evaluation

app.include_router(evaluation.router, prefix="/api/evaluation", tags=["evaluation"])


@app.get("/")
def root():
    """根路径"""
    return {
        "message": "RAG Evaluation System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    """健康检查"""
    return {"status": "healthy"}

