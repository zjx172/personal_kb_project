"""
RAG 服务初始化
"""
import os
import sys
from pathlib import Path
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# 获取当前文件所在目录
_CURRENT_DIR = Path(__file__).parent

# 添加当前目录到 Python 路径（如果还没有）
if str(_CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(_CURRENT_DIR))

# 使用绝对导入（兼容 importlib 直接加载）
try:
    # 尝试相对导入（正常包导入时）
    from .config import (
        VECTOR_STORE_DIR,
        COLLECTION_NAME,
        OPENAI_API_KEY,
        OPENAI_BASE_URL,
        LANGCHAIN_API_KEY,
        LANGCHAIN_TRACING_V2,
        LANGCHAIN_PROJECT,
        LANGCHAIN_ENDPOINT,
    )
    from .retrieval import VectorRetrievalService
    from .rag_pipeline import RAGPipeline
except ImportError:
    # 如果相对导入失败（importlib 直接加载时），使用绝对导入
    import config
    import retrieval
    import rag_pipeline
    
    VECTOR_STORE_DIR = config.VECTOR_STORE_DIR
    COLLECTION_NAME = config.COLLECTION_NAME
    OPENAI_API_KEY = config.OPENAI_API_KEY
    OPENAI_BASE_URL = config.OPENAI_BASE_URL
    LANGCHAIN_API_KEY = config.LANGCHAIN_API_KEY
    LANGCHAIN_TRACING_V2 = config.LANGCHAIN_TRACING_V2
    LANGCHAIN_PROJECT = config.LANGCHAIN_PROJECT
    LANGCHAIN_ENDPOINT = config.LANGCHAIN_ENDPOINT
    
    VectorRetrievalService = retrieval.VectorRetrievalService
    RAGPipeline = rag_pipeline.RAGPipeline

# 配置 LangSmith tracing（如果启用）
if LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
    if LANGCHAIN_ENDPOINT:
        os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT

# 确保已配置 API Key，便于在导入阶段快速暴露配置问题
if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY 未配置，请在项目根目录的 .env 或环境变量中设置"
    )

# 初始化 OpenAI Embeddings
embeddings = OpenAIEmbeddings(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="text-embedding-3-large",
)

# 初始化向量库
vectordb = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=VECTOR_STORE_DIR,
)

# 初始化 LLM
llm = ChatOpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="gpt-4o-mini",
    temperature=0.2,
)

# 初始化检索服务和 RAG pipeline
retrieval_service = VectorRetrievalService(
    vectordb=vectordb,
    llm=llm,
    enable_rerank=True,
)

rag_pipeline = RAGPipeline(
    retrieval_service=retrieval_service,
    llm=llm,
)

# 导出供其他模块使用
__all__ = ["rag_pipeline", "retrieval_service", "llm", "vectordb"]

