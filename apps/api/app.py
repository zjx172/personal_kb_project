"""
FastAPI 应用主文件（重构版）
只负责应用初始化和路由注册
"""
# 兼容 Python 3.9 的新类型语法（必须在所有导入之前）
# 确保在任何可能使用新类型语法的库导入之前加载
# 这样可以确保即使第三方库（如 chromadb, ragas）间接导入 instructor 等库时也能正常工作
try:
    import eval_type_backport  # noqa: F401
except ImportError:
    # 如果导入失败，尝试安装提示
    import sys
    if 'eval_type_backport' not in sys.modules:
        print("警告: eval_type_backport 未安装，某些库可能无法正常工作")
        print("请运行: pip install eval-type-backport")

import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from monitoring import init_sentry

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()],
)

# 初始化监控系统
sentry = init_sentry()

# 创建 FastAPI 应用
app = FastAPI(
    title="WisdomVault（智慧宝库）Backend",
    description="个人知识库系统 API",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
    openapi_url="/openapi.json",  # OpenAPI JSON
)

# 添加 CORS 中间件
# 注意：allow_origins=["*"] 不能与 allow_credentials=True 同时使用
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # 预检请求缓存时间
)

# 添加请求超时中间件（防止请求无限期挂起）
@app.middleware("http")
async def timeout_middleware(request, call_next):
    logger = logging.getLogger(__name__)
    try:
        # 设置最大请求处理时间为 60 秒
        response = await asyncio.wait_for(call_next(request), timeout=60.0)
        return response
    except asyncio.TimeoutError:
        logger.error(f"请求超时: {request.method} {request.url}")
        return JSONResponse(
            status_code=504,
            content={"detail": "Request timeout"}
)

# 注册路由
from routers import (
    auth,
    tasks,
    search,
    docs,
    conversations,
    pdf,
    highlights,
    kb,
    knowledge_bases,
    evaluation,
    chunk_upload,
    file_upload,
    data_sources,
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(search.router)
app.include_router(docs.router)
app.include_router(conversations.router)
app.include_router(pdf.router)
app.include_router(highlights.router)
app.include_router(kb.router)
app.include_router(knowledge_bases.router)
app.include_router(evaluation.router)
app.include_router(chunk_upload.router)
app.include_router(file_upload.router)
app.include_router(data_sources.router)

