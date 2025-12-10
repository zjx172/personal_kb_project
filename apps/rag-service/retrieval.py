"""
向量检索服务层
支持按主题标签、文档类型过滤，并集成 rerank 模型
"""
import logging
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
        rerank_model: str = "BAAI/bge-reranker-base",
        score_threshold: Optional[float] = None,
    ):
        self.vectordb = vectordb
        self.llm = llm
        self.enable_rerank = enable_rerank
        self.rerank_model_name = rerank_model
        # 过滤低相关度片段，0-1 之间；None 表示不滤
        self.score_threshold = score_threshold
        self._reranker = None  # lazy load
        self._logger = logging.getLogger(__name__)
        
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
        initial_k = (
            max(k, rerank_k * 3)
            if (self.enable_rerank and rerank_k)
            else k
        )
        
        # 直接取带相关性分数的结果，便于阈值过滤
        docs_with_scores = self.vectordb.similarity_search_with_relevance_scores(
            query=query,
            k=initial_k,
            filter=where_filter,
        )

        # 过滤低分段，并把分数塞进 metadata，便于后续使用/展示
        filtered_docs = []
        for doc, score in docs_with_scores:
            doc.metadata = dict(doc.metadata) if doc.metadata else {}
            doc.metadata["score"] = float(score) if score is not None else None
            if self.score_threshold is not None and score is not None:
                if score < self.score_threshold:
                    continue
            filtered_docs.append(doc)

        docs = filtered_docs
        
        # 如果启用 rerank，进行重排序
        if self.enable_rerank and rerank_k and len(docs) > rerank_k:
            docs = self._rerank(query, docs, rerank_k)
        
        return docs[:k] if not rerank_k else docs[:rerank_k]
    
    def _rerank(self, query: str, docs: List[LCDocument], top_k: int) -> List[LCDocument]:
        """
        使用专门的 rerank 模型（优先 BGE CrossEncoder），失败时回退到 LLM 评分
        """
        reranked = self._rerank_with_bge(query, docs, top_k)
        if reranked is not None:
            return reranked

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

    def _rerank_with_bge(self, query: str, docs: List[LCDocument], top_k: int) -> Optional[List[LCDocument]]:
        """
        使用 BGE Reranker（CrossEncoder）进行重排；若依赖缺失返回 None。
        """
        try:
            from sentence_transformers import CrossEncoder  # type: ignore
            import torch
        except Exception:
            return None

        # 优先用可用的 GPU，但在 MPS 上部分模型存在 meta tensor bug，失败时回退 CPU
        def _pick_device() -> str:
            if torch.cuda.is_available():
                return "cuda"
            if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                return "mps"
            return "cpu"

        try:
            if self._reranker is None:
                device = _pick_device()
                try:
                    self._reranker = CrossEncoder(
                        self.rerank_model_name,
                        device=device,
                        trust_remote_code=True,
                    )
                    self._logger.info(
                        "Use BGE CrossEncoder reranker '%s' on device=%s",
                        self.rerank_model_name,
                        device,
                    )
                except Exception as e:
                    # 尝试回退到 CPU 再加载，避免 MPS/meta tensor 报错
                    self._logger.warning(
                        f"加载 rerank 模型在 {device} 失败，尝试 CPU: {e}"
                    )
                    self._reranker = CrossEncoder(
                        self.rerank_model_name,
                        device="cpu",
                        trust_remote_code=True,
                    )
                    self._logger.info(
                        "Fallback to CPU for BGE CrossEncoder reranker '%s'",
                        self.rerank_model_name,
                    )
        except Exception as e:
            self._logger.warning(f"加载 rerank 模型失败，将回退到 LLM 评分: {e}")
            return None

        try:
            pairs = [[query, doc.page_content] for doc in docs]
            scores = self._reranker.predict(pairs)
            scored_docs = list(zip(scores, docs))
            scored_docs.sort(key=lambda x: float(x[0]), reverse=True)
            return [doc for _, doc in scored_docs[:top_k]]
        except Exception as e:
            self._logger.warning(f"rerank 过程中出错，回退到 LLM 评分: {e}")
            return None
    
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
            chunk_index = metadata.get("chunk_index")
            results.append({
                "index": i,
                "content": doc.page_content,
                "source": metadata.get("source", "unknown"),
                "title": metadata.get("title", ""),
                "doc_type": metadata.get("doc_type"),
                "doc_id": metadata.get("doc_id"),
                "page": metadata.get("page"),
                "chunk_index": chunk_index,
                "score": metadata.get("score"),
            })
        
        return results

