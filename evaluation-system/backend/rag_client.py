"""
RAG 服务客户端
用于连接到主系统的 RAG 服务
"""
import requests
import logging
from typing import Dict, Any, Optional, List
from config import RAG_SERVICE_URL, RAG_SERVICE_API_KEY

logger = logging.getLogger(__name__)


class RAGClient:
    """RAG 服务客户端"""
    
    def __init__(self, base_url: str = None, api_key: str = None):
        self.base_url = base_url or RAG_SERVICE_URL
        self.api_key = api_key or RAG_SERVICE_API_KEY
        self.session = requests.Session()
        
        if self.api_key:
            self.session.headers.update({
                "Authorization": f"Bearer {self.api_key}"
            })
    
    def query(
        self,
        question: str,
        knowledge_base_id: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Dict[str, Any]:
        """
        执行 RAG 查询
        
        Args:
            question: 问题
            knowledge_base_id: 知识库 ID
            k: 检索数量
            rerank_k: 重排序数量
        
        Returns:
            包含 answer 和 citations 的字典
        """
        try:
            url = f"{self.base_url}/search/query"
            payload = {
                "question": question,
                "knowledge_base_id": knowledge_base_id,
                "k": k,
                "rerank_k": rerank_k,
            }
            
            response = self.session.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            return {
                "answer": data.get("answer", ""),
                "citations": data.get("citations", []),
            }
        except Exception as e:
            logger.error(f"RAG 查询失败: {str(e)}", exc_info=True)
            raise
    
    def retrieve(
        self,
        query: str,
        knowledge_base_id: Optional[str] = None,
        k: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        检索文档（不生成答案）
        
        Args:
            query: 查询文本
            knowledge_base_id: 知识库 ID
            k: 检索数量
        
        Returns:
            检索结果列表
        """
        try:
            url = f"{self.base_url}/search/retrieve"
            payload = {
                "query": query,
                "knowledge_base_id": knowledge_base_id,
                "k": k,
            }
            
            response = self.session.post(url, json=payload, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            return data.get("results", [])
        except Exception as e:
            logger.error(f"检索失败: {str(e)}", exc_info=True)
            raise


# 创建全局客户端实例
rag_client = RAGClient()

