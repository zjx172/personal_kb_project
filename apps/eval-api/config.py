"""
评估系统配置
"""
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 数据库配置
DB_PATH = os.path.join(BASE_DIR, "evaluation.db")

# OpenAI 配置（用于 RAGAS 评估）
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# LangSmith 配置（用于追踪）
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "rag-evaluation")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

# RAG 服务配置（连接到主系统的 RAG 服务）
RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:8000")
RAG_SERVICE_API_KEY = os.getenv("RAG_SERVICE_API_KEY", "")

# 环境配置
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# CORS 配置
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5174,http://localhost:3000"
).split(",")

