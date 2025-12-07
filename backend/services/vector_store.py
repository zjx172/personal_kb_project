"""
向量库服务初始化
使用独立的 RAG 服务包
"""
import sys
from pathlib import Path

# 添加 rag-service 到 Python 路径
PROJECT_ROOT = Path(__file__).parent.parent.parent
RAG_SERVICE_PATH = PROJECT_ROOT / "rag-service"
if str(RAG_SERVICE_PATH) not in sys.path:
    sys.path.insert(0, str(RAG_SERVICE_PATH))

# 使用适配器模式，支持 Python 包和 gRPC 两种方式
# 默认使用 Python 包模式（高性能），可通过环境变量切换到 gRPC
import os
USE_GRPC = os.getenv("USE_GRPC_RAG_SERVICE", "false").lower() == "true"

if USE_GRPC:
    # gRPC 模式：使用适配器
    from services.rag_adapter import rag_service as rag_service_adapter
    # 为了向后兼容，创建包装器
    class RAGPipelineWrapper:
        def query(self, question, doc_type=None, k=10, rerank_k=5):
            return rag_service_adapter.query(question, doc_type, k, rerank_k)
        
        def stream_query(self, question, doc_type=None, k=10, rerank_k=5):
            return rag_service_adapter.stream_query(question, doc_type, k, rerank_k)
    
    rag_pipeline = RAGPipelineWrapper()
    # gRPC 模式下，retrieval_service 需要从本地导入（如果需要）
    from rag_service import retrieval_service
else:
    # Python 包模式：直接导入（默认，高性能）
    from rag_service import rag_pipeline, retrieval_service
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from config import (
    VECTOR_STORE_DIR,
    COLLECTION_NAME,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)
from hybrid_search import HybridSearchService

# 初始化 OpenAI Embeddings（用于混合搜索）
embeddings = OpenAIEmbeddings(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="text-embedding-3-large",
)

# 初始化向量库（用于混合搜索）
vectordb = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=VECTOR_STORE_DIR,
)

# 初始化混合搜索服务
hybrid_search_service = HybridSearchService(vectordb=vectordb)

# 为了向后兼容，导入 llm（如果需要）
if not USE_GRPC:
    from rag_service import llm
else:
    # gRPC 模式下，llm 需要从本地导入（如果需要）
    from langchain_openai import ChatOpenAI
    from config import OPENAI_API_KEY, OPENAI_BASE_URL
    llm = ChatOpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
        model="gpt-4o-mini",
        temperature=0.2,
    )

# 导出服务（保持向后兼容）
__all__ = [
    "rag_pipeline",
    "retrieval_service",
    "hybrid_search_service",
    "vectordb",
    "llm",
]

