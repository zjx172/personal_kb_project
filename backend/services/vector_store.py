"""
向量库服务初始化
"""
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from config import (
    VECTOR_STORE_DIR,
    COLLECTION_NAME,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)
from retrieval import VectorRetrievalService
from rag_pipeline import RAGPipeline
from hybrid_search import HybridSearchService

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

# 初始化混合搜索服务
hybrid_search_service = HybridSearchService(vectordb=vectordb)

