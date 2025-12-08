"""
gRPC 服务器实现
为 RAG 服务提供 gRPC 接口，支持独立部署和扩展
"""
import logging
from concurrent import futures
import grpc
from grpc import aio

# 注意：需要先编译 proto 文件生成 Python 代码
# python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. proto/rag_service.proto

try:
    from proto import rag_service_pb2, rag_service_pb2_grpc
except ImportError:
    logging.warning("gRPC proto 文件未编译，请先运行: python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. proto/rag_service.proto")
    rag_service_pb2 = None
    rag_service_pb2_grpc = None

from services import rag_pipeline, retrieval_service

logger = logging.getLogger(__name__)


class RAGServiceServicer(rag_service_pb2_grpc.RAGServiceServicer):
    """RAG 服务 gRPC 实现"""
    
    def Query(self, request, context):
        """执行查询（非流式）"""
        try:
            result = rag_pipeline.query(
                question=request.question,
                doc_type=request.doc_type if request.HasField("doc_type") else None,
                k=request.k,
                rerank_k=request.rerank_k,
            )
            
            # 转换 citations
            citations = [
                rag_service_pb2.Citation(
                    index=c["index"],
                    source=c["source"],
                    title=c.get("title", ""),
                    snippet=c.get("snippet", ""),
                    doc_id=c.get("doc_id") or "",
                    page=c.get("page") or 0,
                    chunk_index=c.get("chunk_index") or 0,
                    chunk_position=c.get("chunk_position") or "",
                )
                for c in result["citations"]
            ]
            
            return rag_service_pb2.QueryResponse(
                answer=result["answer"],
                citations=citations,
            )
        except Exception as e:
            logger.error(f"Query 失败: {str(e)}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"查询失败: {str(e)}")
            raise
    
    def StreamQuery(self, request, context):
        """执行流式查询"""
        try:
            for result in rag_pipeline.stream_query(
                question=request.question,
                doc_type=request.doc_type if request.HasField("doc_type") else None,
                k=request.k,
                rerank_k=request.rerank_k,
            ):
                if result["type"] == "citations":
                    citations = [
                        rag_service_pb2.Citation(
                            index=c["index"],
                            source=c["source"],
                            title=c.get("title", ""),
                            snippet=c.get("snippet", ""),
                            doc_id=c.get("doc_id") or "",
                            page=c.get("page") or 0,
                            chunk_index=c.get("chunk_index") or 0,
                            chunk_position=c.get("chunk_position") or "",
                        )
                        for c in result["citations"]
                    ]
                    yield rag_service_pb2.StreamChunk(
                        citations=rag_service_pb2.CitationsChunk(citations=citations)
                    )
                elif result["type"] == "chunk":
                    yield rag_service_pb2.StreamChunk(
                        text=rag_service_pb2.TextChunk(chunk=result["chunk"])
                    )
                elif result["type"] == "final":
                    citations = [
                        rag_service_pb2.Citation(
                            index=c["index"],
                            source=c["source"],
                            title=c.get("title", ""),
                            snippet=c.get("snippet", ""),
                            doc_id=c.get("doc_id") or "",
                            page=c.get("page") or 0,
                            chunk_index=c.get("chunk_index") or 0,
                            chunk_position=c.get("chunk_position") or "",
                        )
                        for c in result["citations"]
                    ]
                    yield rag_service_pb2.StreamChunk(
                        final=rag_service_pb2.FinalChunk(
                            answer=result["answer"],
                            citations=citations,
                        )
                    )
                elif result["type"] == "error":
                    yield rag_service_pb2.StreamChunk(
                        error=rag_service_pb2.ErrorChunk(message=result.get("message", "未知错误"))
                    )
        except Exception as e:
            logger.error(f"StreamQuery 失败: {str(e)}", exc_info=True)
            yield rag_service_pb2.StreamChunk(
                error=rag_service_pb2.ErrorChunk(message=f"查询失败: {str(e)}")
            )
    
    def Retrieve(self, request, context):
        """仅执行检索"""
        try:
            results = retrieval_service.retrieve_with_metadata(
                query=request.query,
                k=request.k,
                doc_type=request.doc_type if request.HasField("doc_type") else None,
                rerank_k=request.rerank_k if request.HasField("rerank_k") else None,
            )
            
            retrieval_results = [
                rag_service_pb2.RetrievalResult(
                    index=r["index"],
                    content=r["content"],
                    source=r["source"],
                    title=r.get("title", ""),
                    doc_type=r.get("doc_type") or "",
                    doc_id=r.get("doc_id") or "",
                    page=r.get("page") or 0,
                    chunk_index=r.get("chunk_index") or 0,
                )
                for r in results
            ]
            
            return rag_service_pb2.RetrieveResponse(results=retrieval_results)
        except Exception as e:
            logger.error(f"Retrieve 失败: {str(e)}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(f"检索失败: {str(e)}")
            raise


async def serve(port: int = 50051):
    """启动 gRPC 服务器"""
    server = aio.server(futures.ThreadPoolExecutor(max_workers=10))
    
    if rag_service_pb2_grpc is None:
        raise ImportError("gRPC proto 文件未编译")
    
    rag_service_pb2_grpc.add_RAGServiceServicer_to_server(
        RAGServiceServicer(), server
    )
    
    listen_addr = f"[::]:{port}"
    server.add_insecure_port(listen_addr)
    
    logger.info(f"gRPC 服务器启动在 {listen_addr}")
    await server.start()
    await server.wait_for_termination()


if __name__ == "__main__":
    import asyncio
    from config import SERVICE_PORT
    
    logging.basicConfig(level=logging.INFO)
    asyncio.run(serve(port=SERVICE_PORT))

