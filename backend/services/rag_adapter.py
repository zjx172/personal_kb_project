"""
RAG 服务适配器
支持通过 Python 包或 gRPC 调用 RAG 服务
"""
import os
import logging
from typing import Dict, Any, Optional, Iterator
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# 配置：选择使用哪种方式
USE_GRPC = os.getenv("USE_GRPC_RAG_SERVICE", "false").lower() == "true"
GRPC_SERVER_URL = os.getenv("GRPC_RAG_SERVICE_URL", "localhost:50051")


class RAGServiceInterface(ABC):
    """RAG 服务接口"""
    
    @abstractmethod
    def query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Dict[str, Any]:
        """执行查询（非流式）"""
        pass
    
    @abstractmethod
    def stream_query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Iterator[Dict[str, Any]]:
        """执行流式查询"""
        pass


class LocalRAGService(RAGServiceInterface):
    """本地 Python 包实现"""
    
    def __init__(self):
        import sys
        from pathlib import Path
        
        # 添加 rag-service 到 Python 路径
        PROJECT_ROOT = Path(__file__).parent.parent.parent
        RAG_SERVICE_PATH = PROJECT_ROOT / "rag-service"
        if str(RAG_SERVICE_PATH) not in sys.path:
            sys.path.insert(0, str(RAG_SERVICE_PATH))
        
        from rag_service import rag_pipeline
        self.pipeline = rag_pipeline
    
    def query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Dict[str, Any]:
        """执行查询"""
        return self.pipeline.query(
            question=question,
            doc_type=doc_type,
            k=k,
            rerank_k=rerank_k,
        )
    
    def stream_query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Iterator[Dict[str, Any]]:
        """执行流式查询"""
        return self.pipeline.stream_query(
            question=question,
            doc_type=doc_type,
            k=k,
            rerank_k=rerank_k,
        )


class GRPCRAGService(RAGServiceInterface):
    """gRPC 实现"""
    
    def __init__(self, server_url: str = GRPC_SERVER_URL):
        try:
            import grpc
            from proto import rag_service_pb2, rag_service_pb2_grpc
            
            self.channel = grpc.insecure_channel(server_url)
            self.stub = rag_service_pb2_grpc.RAGServiceStub(self.channel)
            self.pb2 = rag_service_pb2
        except ImportError as e:
            logger.error(f"gRPC 导入失败: {e}")
            raise ImportError("请先编译 proto 文件: python -m grpc_tools.protoc ...")
    
    def query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Dict[str, Any]:
        """执行查询"""
        request = self.pb2.QueryRequest(
            question=question,
            k=k,
            rerank_k=rerank_k,
        )
        if doc_type:
            request.doc_type = doc_type
        
        response = self.stub.Query(request)
        
        # 转换响应
        citations = [
            {
                "index": c.index,
                "source": c.source,
                "title": c.title,
                "snippet": c.snippet,
                "doc_id": c.doc_id if c.doc_id else None,
                "page": c.page if c.page else None,
                "chunk_index": c.chunk_index if c.chunk_index else None,
                "chunk_position": c.chunk_position if c.chunk_position else None,
            }
            for c in response.citations
        ]
        
        return {
            "answer": response.answer,
            "citations": citations,
        }
    
    def stream_query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Iterator[Dict[str, Any]]:
        """执行流式查询"""
        request = self.pb2.QueryRequest(
            question=question,
            k=k,
            rerank_k=rerank_k,
        )
        if doc_type:
            request.doc_type = doc_type
        
        for chunk in self.stub.StreamQuery(request):
            if chunk.HasField("citations"):
                citations = [
                    {
                        "index": c.index,
                        "source": c.source,
                        "title": c.title,
                        "snippet": c.snippet,
                        "doc_id": c.doc_id if c.doc_id else None,
                        "page": c.page if c.page else None,
                        "chunk_index": c.chunk_index if c.chunk_index else None,
                        "chunk_position": c.chunk_position if c.chunk_position else None,
                    }
                    for c in chunk.citations.citations
                ]
                yield {"type": "citations", "citations": citations}
            elif chunk.HasField("text"):
                yield {"type": "chunk", "chunk": chunk.text.chunk}
            elif chunk.HasField("final"):
                citations = [
                    {
                        "index": c.index,
                        "source": c.source,
                        "title": c.title,
                        "snippet": c.snippet,
                        "doc_id": c.doc_id if c.doc_id else None,
                        "page": c.page if c.page else None,
                        "chunk_index": c.chunk_index if c.chunk_index else None,
                        "chunk_position": c.chunk_position if c.chunk_position else None,
                    }
                    for c in chunk.final.citations
                ]
                yield {
                    "type": "final",
                    "answer": chunk.final.answer,
                    "citations": citations,
                }
            elif chunk.HasField("error"):
                yield {"type": "error", "message": chunk.error.message}


# 根据配置创建服务实例
def create_rag_service() -> RAGServiceInterface:
    """创建 RAG 服务实例"""
    if USE_GRPC:
        logger.info(f"使用 gRPC RAG 服务: {GRPC_SERVER_URL}")
        return GRPCRAGService(GRPC_SERVER_URL)
    else:
        logger.info("使用本地 Python 包 RAG 服务")
        return LocalRAGService()


# 全局服务实例
rag_service = create_rag_service()

