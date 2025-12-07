"""
RAG 服务初始化
"""
import os
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
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

# 配置 LangSmith tracing（如果启用）
if LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
    if LANGCHAIN_ENDPOINT:
        os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT

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

