"""
RAG 服务配置
"""
import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI 配置
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

# 向量库配置
# 默认使用 backend 的向量库（共享存储）
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VECTOR_STORE_DIR = os.path.join(BACKEND_DIR, "backend", "vector_store")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "personal_kb")

# 服务配置
SERVICE_HOST = os.getenv("RAG_SERVICE_HOST", "0.0.0.0")
SERVICE_PORT = int(os.getenv("RAG_SERVICE_PORT", "8001"))

# LangSmith 配置
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "wisdomvault-rag")
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

