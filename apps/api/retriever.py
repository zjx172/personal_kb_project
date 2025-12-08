"""
向量检索服务层
支持按主题标签、文档类型过滤，并引入 rerank 模型提升检索质量
"""
from typing import List, Optional, Dict, Any
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import DocumentCompressorPipeline
from langchain_openai import OpenAIEmbeddings as RerankEmbeddings
import requests
import json


class VectorRetriever:
    """向量检索服务类"""
    
    def __init__(
        self,
        vectordb: Chroma,
        rerank_model: Optional[str] = None,
        rerank_api_key: Optional[str] = None,
        rerank_base_url: Optional[str] = None,
    ):
        self.vectordb = vectordb
        self.rerank_model = rerank_model
        self.rerank_api_key = rerank_api_key
        self.rerank_base_url = rerank_base_url
    
    def retrieve(
        self,
        query: str,
        k: int = 10,
        topic: Optional[str] = None,
        doc_type: Optional[str] = None,
        use_rerank: bool = True,
        rerank_top_k: int = 5,
    ) -> List[Document]:
        """
        检索相关文档
        
        Args:
            query: 查询文本
            k: 初始检索数量
            topic: 主题标签过滤（可选）
            doc_type: 文档类型过滤（可选，如 'markdown_doc', 'pdf', 'md'）
            use_rerank: 是否使用 rerank
            rerank_top_k: rerank 后返回的 top k 数量
        
        Returns:
            检索到的文档列表
        """
        # 构建过滤条件
        where = {}
        if topic:
            where["topic"] = topic
        if doc_type:
            where["doc_type"] = doc_type
        
        # 执行向量检索
        if where:
            # 使用 where 条件过滤
            docs = self.vectordb.similarity_search(
                query,
                k=k,
                where=where if where else None,
            )
        else:
            # 不使用过滤条件
            retriever = self.vectordb.as_retriever(search_kwargs={"k": k})
            docs = retriever.get_relevant_documents(query)
        
        if not docs:
            return []
        
        # 如果启用 rerank，对结果进行重排序
        if use_rerank and len(docs) > 1:
            docs = self._rerank(query, docs, top_k=rerank_top_k)
        
        return docs
    
    def _rerank(
        self,
        query: str,
        documents: List[Document],
        top_k: int = 5,
    ) -> List[Document]:
        """
        使用 rerank 模型对检索结果重排序
        
        如果配置了 rerank API，使用 API；否则使用简单的相似度重排序
        """
        if self.rerank_model and self.rerank_api_key:
            return self._rerank_with_api(query, documents, top_k)
        else:
            # 如果没有配置 rerank API，返回原始结果的前 top_k
            return documents[:top_k]
    
    def _rerank_with_api(
        self,
        query: str,
        documents: List[Document],
        top_k: int = 5,
    ) -> List[Document]:
        """
        使用 rerank API 进行重排序
        
        这里使用 OpenAI 兼容的 rerank API（如 Jina Rerank）
        """
        try:
            # 准备 rerank 请求
            texts = [doc.page_content for doc in documents]
            
            # 使用 Jina Rerank API（示例）
            # 如果使用其他 rerank 服务，需要调整 API 调用
            if "jina" in self.rerank_model.lower():
                url = f"{self.rerank_base_url}/v1/rerank"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.rerank_api_key}",
                }
                data = {
                    "model": self.rerank_model,
                    "query": query,
                    "documents": texts,
                    "top_n": top_k,
                }
                
                response = requests.post(url, headers=headers, json=data, timeout=10)
                response.raise_for_status()
                result = response.json()
                
                # 根据 rerank 结果重新排序文档
                reranked_indices = [item["index"] for item in result.get("results", [])]
                reranked_docs = [documents[i] for i in reranked_indices if i < len(documents)]
                
                return reranked_docs[:top_k]
            else:
                # 其他 rerank API 可以在这里扩展
                return documents[:top_k]
        except Exception as e:
            print(f"[!] Rerank 失败: {e}，返回原始结果")
            return documents[:top_k]
    
    def get_metadata_filters(self) -> Dict[str, List[str]]:
        """
        获取可用的元数据过滤选项
        
        Returns:
            包含 topic 和 doc_type 选项的字典
        """
        # 从向量库中获取所有唯一的元数据值
        # 注意：这需要向量库支持元数据查询
        # Chroma 可能不支持直接查询所有元数据，这里返回空列表
        # 实际使用时可以通过其他方式获取（如从数据库查询）
        return {
            "topics": [],
            "doc_types": [],
        }

