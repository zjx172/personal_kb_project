"""
FastAPI 应用主文件（重构版）
只负责应用初始化和路由注册
"""
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
app = FastAPI(title="Personal KB Backend")

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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
    search_history,
    knowledge_bases,
    evaluation,
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(search.router)
app.include_router(docs.router)
app.include_router(conversations.router)
app.include_router(pdf.router)
app.include_router(highlights.router)
app.include_router(kb.router)
app.include_router(search_history.router)
app.include_router(knowledge_bases.router)
app.include_router(evaluation.router)

