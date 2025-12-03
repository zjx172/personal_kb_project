"""
混合搜索：结合关键词搜索和向量搜索
"""
from typing import List, Dict, Any, Optional
from langchain_chroma import Chroma
from langchain.schema import Document as LCDocument
from sqlalchemy.orm import Session
from models import MarkdownDoc
import json
from datetime import datetime


class HybridSearchService:
    """混合搜索服务，结合关键词搜索和向量搜索"""
    
    def __init__(self, vectordb: Chroma):
        self.vectordb = vectordb
    
    def keyword_search(
        self,
        query: str,
        db: Session,
        doc_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        关键词搜索：在文档标题、内容、摘要中搜索关键词
        
        Args:
            query: 搜索关键词
            db: 数据库会话
            doc_type: 文档类型过滤
            tags: 标签过滤
            start_date: 开始日期
            end_date: 结束日期
            limit: 返回数量限制
        
        Returns:
            搜索结果列表
        """
        # 构建查询
        q = db.query(MarkdownDoc)
        
        # 关键词搜索：在标题、内容、摘要中搜索
        keywords = query.split()
        if keywords:
            from sqlalchemy import or_
            conditions = []
            for keyword in keywords:
                keyword_pattern = f"%{keyword}%"
                conditions.extend([
                    MarkdownDoc.title.like(keyword_pattern),
                    MarkdownDoc.content.like(keyword_pattern),
                    MarkdownDoc.summary.like(keyword_pattern),
                ])
            q = q.filter(or_(*conditions))
        
        # 文档类型过滤
        if doc_type:
            q = q.filter(MarkdownDoc.doc_type == doc_type)
        
        # 标签过滤
        if tags:
            for tag in tags:
                q = q.filter(MarkdownDoc.tags.like(f"%{tag}%"))
        
        # 日期过滤
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                q = q.filter(MarkdownDoc.created_at >= start_dt)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                # 结束日期包含当天
                from datetime import timedelta
                end_dt = end_dt + timedelta(days=1)
                q = q.filter(MarkdownDoc.created_at < end_dt)
            except ValueError:
                pass
        
        # 按相关性排序（简单实现：按创建时间倒序）
        docs = q.order_by(MarkdownDoc.created_at.desc()).limit(limit).all()
        
        # 转换为结果格式
        results = []
        for i, doc in enumerate(docs, start=1):
            # 计算相关性分数（简单实现）
            score = self._calculate_keyword_score(query, doc)
            
            results.append({
                "index": i,
                "doc_id": doc.id,
                "title": doc.title,
                "content": doc.content[:500],  # 截取前500字符
                "summary": doc.summary,
                "source": f"markdown_doc:{doc.id}",
                "score": score,
                "doc_type": doc.doc_type,
                "tags": json.loads(doc.tags) if doc.tags else None,
            })
        
        # 按分数排序
        results.sort(key=lambda x: x["score"], reverse=True)
        
        return results
    
    def _calculate_keyword_score(self, query: str, doc: MarkdownDoc) -> float:
        """计算关键词匹配分数"""
        score = 0.0
        query_lower = query.lower()
        text_lower = (doc.title + " " + (doc.summary or "") + " " + doc.content[:500]).lower()
        
        keywords = query_lower.split()
        for keyword in keywords:
            if len(keyword) < 2:
                continue
            # 标题匹配权重更高
            if keyword in doc.title.lower():
                score += 3.0
            # 摘要匹配
            if doc.summary and keyword in doc.summary.lower():
                score += 2.0
            # 内容匹配
            if keyword in text_lower:
                score += 1.0
        
        return score
    
    def hybrid_search(
        self,
        query: str,
        db: Session,
        retrieval_service,
        doc_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        k: int = 10,
        keyword_weight: float = 0.3,
        vector_weight: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        混合搜索：结合关键词搜索和向量搜索
        
        Args:
            query: 搜索查询
            db: 数据库会话
            retrieval_service: 向量检索服务
            doc_type: 文档类型过滤
            tags: 标签过滤
            start_date: 开始日期
            end_date: 结束日期
            k: 返回数量
            keyword_weight: 关键词搜索权重
            vector_weight: 向量搜索权重
        
        Returns:
            混合搜索结果
        """
        # 向量搜索
        vector_results = retrieval_service.retrieve_with_metadata(
            query=query,
            k=k * 2,  # 检索更多，后续合并去重
            doc_type=doc_type,
            rerank_k=k,
        )
        
        # 关键词搜索
        keyword_results = self.keyword_search(
            query=query,
            db=db,
            doc_type=doc_type,
            tags=tags,
            start_date=start_date,
            end_date=end_date,
            limit=k * 2,
        )
        
        # 合并结果
        doc_scores = {}  # doc_id -> {vector_score, keyword_score, doc_info}
        
        # 处理向量搜索结果
        for result in vector_results:
            doc_id = result.get("doc_id")
            if doc_id:
                doc_scores[doc_id] = {
                    "vector_score": 1.0 - (result.get("index", 0) - 1) * 0.1,  # 简单的分数计算
                    "keyword_score": 0.0,
                    "doc_info": result,
                }
        
        # 处理关键词搜索结果
        for result in keyword_results:
            doc_id = result.get("doc_id")
            if doc_id:
                if doc_id in doc_scores:
                    doc_scores[doc_id]["keyword_score"] = result.get("score", 0.0) / 10.0  # 归一化
                else:
                    doc_scores[doc_id] = {
                        "vector_score": 0.0,
                        "keyword_score": result.get("score", 0.0) / 10.0,
                        "doc_info": result,
                    }
        
        # 计算混合分数并排序
        hybrid_results = []
        for doc_id, scores in doc_scores.items():
            hybrid_score = (
                scores["vector_score"] * vector_weight +
                scores["keyword_score"] * keyword_weight
            )
            doc_info = scores["doc_info"]
            doc_info["hybrid_score"] = hybrid_score
            hybrid_results.append(doc_info)
        
        # 按混合分数排序
        hybrid_results.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)
        
        # 重新分配索引
        for i, result in enumerate(hybrid_results[:k], start=1):
            result["index"] = i
        
        return hybrid_results[:k]

