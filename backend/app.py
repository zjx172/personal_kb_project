"""
FastAPI 应用主文件（重构版）
只负责应用初始化和路由注册
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
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
    allow_methods=["*"],
    allow_headers=["*"],
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

