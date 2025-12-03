"""
向量检索服务层
支持按主题标签、文档类型过滤，并集成 rerank 模型
"""
from typing import List, Optional, Dict, Any
from langchain_chroma import Chroma
from langchain.schema import Document as LCDocument
from langchain_openai import ChatOpenAI


class VectorRetrievalService:
    """向量检索服务，支持过滤和 rerank"""
    
    def __init__(
        self,
        vectordb: Chroma,
        llm: Optional[ChatOpenAI] = None,
        enable_rerank: bool = False,
    ):
        self.vectordb = vectordb
        self.llm = llm
        self.enable_rerank = enable_rerank
        
    def _build_filter(self, doc_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """构建 Chroma 过滤条件"""
        filters = {}
        if doc_type:
            filters["doc_type"] = doc_type
        return filters if filters else None
    
    def retrieve(
        self,
        query: str,
        k: int = 10,
        doc_type: Optional[str] = None,
        rerank_k: Optional[int] = None,
    ) -> List[LCDocument]:
        """
        检索相关文档
        
        Args:
            query: 查询文本
            k: 初始检索数量（rerank 前）
            doc_type: 文档类型过滤
            rerank_k: rerank 后保留的数量（如果启用 rerank）
        
        Returns:
            检索到的文档列表
        """
        # 构建过滤条件
        where_filter = self._build_filter(doc_type)
        
        # 初始检索：如果启用 rerank，检索更多文档
        initial_k = rerank_k * 2 if (self.enable_rerank and rerank_k) else k
        
        # 使用 retriever 检索
        retriever = self.vectordb.as_retriever(
            search_kwargs={
                "k": initial_k,
                "filter": where_filter,
            }
        )
        
        docs = retriever.get_relevant_documents(query)
        
        # 如果启用 rerank，进行重排序
        if self.enable_rerank and rerank_k and len(docs) > rerank_k:
            docs = self._rerank(query, docs, rerank_k)
        
        return docs[:k] if not rerank_k else docs[:rerank_k]
    
    def _rerank(self, query: str, docs: List[LCDocument], top_k: int) -> List[LCDocument]:
        """
        使用 LLM 进行 rerank
        
        注意：这是一个简单的实现。生产环境建议使用专门的 rerank 模型
        如 Cohere Rerank API 或 BGE Reranker
        """
        if not self.llm:
            # 如果没有 LLM，直接返回前 k 个
            return docs[:top_k]
        
        # 简单的 rerank：使用 LLM 对每个文档的相关性进行评分
        # 这里使用一个简化的方法：让 LLM 判断每个文档与查询的相关性
        scored_docs = []
        
        for doc in docs:
            # 构建评分 prompt
            score_prompt = f"""请评估以下文档片段与查询的相关性，返回 0-10 的分数（10 表示最相关）。

查询：{query}

文档片段：
{doc.page_content[:500]}

只返回一个数字分数（0-10）："""
            
            try:
                response = self.llm.invoke(score_prompt)
                score = float(response.content.strip())
                scored_docs.append((score, doc))
            except Exception:
                # 如果评分失败，使用默认分数
                scored_docs.append((5.0, doc))
        
        # 按分数排序
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        # 返回前 top_k 个
        return [doc for _, doc in scored_docs[:top_k]]
    
    def retrieve_with_metadata(
        self,
        query: str,
        k: int = 10,
        doc_type: Optional[str] = None,
        rerank_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        检索文档并返回带元数据的结构化结果
        
        Returns:
            包含文档内容和元数据的字典列表
        """
        docs = self.retrieve(query, k, doc_type, rerank_k)
        
        results = []
        for i, doc in enumerate(docs, start=1):
            metadata = doc.metadata.copy()
            results.append({
                "index": i,
                "content": doc.page_content,
                "source": metadata.get("source", "unknown"),
                "title": metadata.get("title", ""),
                "doc_type": metadata.get("doc_type"),
                "doc_id": metadata.get("doc_id"),
                "page": metadata.get("page"),
            })
        
        return results

