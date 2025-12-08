"""
AI 智能服务：文档摘要生成、标签推荐等
"""
from typing import List, Optional
from langchain_openai import ChatOpenAI
from config import OPENAI_API_KEY, OPENAI_BASE_URL


class AIServices:
    """AI 智能服务类"""
    
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            model="gpt-4o-mini",
            temperature=0.3,
        )
    
    def generate_summary(self, content: str, max_length: int = 200) -> str:
        """
        生成文档摘要
        
        Args:
            content: 文档内容
            max_length: 摘要最大长度
        
        Returns:
            文档摘要
        """
        if not content or len(content.strip()) < 50:
            return ""
        
        # 限制内容长度，避免 token 过多
        content_preview = content[:3000] if len(content) > 3000 else content
        
        prompt = f"""请为以下文档生成一个简洁的摘要，摘要应该：
1. 概括文档的核心内容
2. 长度控制在 {max_length} 字以内
3. 使用简洁明了的语言

文档内容：
{content_preview}

摘要："""
        
        try:
            response = self.llm.invoke(prompt)
            summary = response.content.strip()
            # 确保摘要不超过最大长度
            if len(summary) > max_length:
                summary = summary[:max_length] + "..."
            return summary
        except Exception as e:
            print(f"生成摘要失败: {e}")
            return ""
    
    def recommend_tags(self, title: str, content: str, existing_tags: Optional[List[str]] = None) -> List[str]:
        """
        推荐文档标签
        
        Args:
            title: 文档标题
            content: 文档内容
            existing_tags: 已有标签
        
        Returns:
            推荐的标签列表
        """
        if not content:
            return []
        
        # 限制内容长度
        content_preview = content[:2000] if len(content) > 2000 else content
        
        existing_tags_str = f"已有标签：{', '.join(existing_tags)}" if existing_tags else "无已有标签"
        
        prompt = f"""请为以下文档推荐3-5个标签，要求：
1. 标签应该简洁（1-3个字）
2. 能够准确概括文档的主题和内容
3. 使用中文标签
4. 如果已有标签，可以在此基础上补充

文档标题：{title}

文档内容预览：
{content_preview}

{existing_tags_str}

请只返回标签，用逗号分隔，不要有其他说明文字："""
        
        try:
            response = self.llm.invoke(prompt)
            tags_str = response.content.strip()
            # 解析标签
            tags = [tag.strip() for tag in tags_str.split(",") if tag.strip()]
            # 去重并限制数量
            tags = list(dict.fromkeys(tags))[:5]  # 保持顺序的去重
            return tags
        except Exception as e:
            print(f"推荐标签失败: {e}")
            return []
    
    def find_related_docs(
        self,
        doc_content: str,
        doc_id: str,
        all_docs: List[dict],
        top_k: int = 5
    ) -> List[dict]:
        """
        基于内容相似度推荐相关文档
        
        Args:
            doc_content: 当前文档内容
            doc_id: 当前文档 ID
            all_docs: 所有文档列表（包含 id, title, content, summary）
            top_k: 返回前 k 个相关文档
        
        Returns:
            相关文档列表
        """
        if not doc_content or len(all_docs) <= 1:
            return []
        
        # 使用简单的关键词匹配和内容相似度
        # 这里可以使用更复杂的语义相似度计算
        
        # 提取当前文档的关键词（简单实现：取前100个字符）
        doc_keywords = doc_content[:200].lower()
        
        scored_docs = []
        for doc in all_docs:
            if doc.get("id") == doc_id:
                continue
            
            score = 0
            doc_text = (doc.get("title", "") + " " + doc.get("summary", "") + " " + doc.get("content", "")[:500]).lower()
            
            # 简单的关键词匹配评分
            for keyword in doc_keywords.split()[:10]:  # 只取前10个词
                if len(keyword) > 2 and keyword in doc_text:
                    score += 1
            
            if score > 0:
                scored_docs.append({
                    "doc": doc,
                    "score": score
                })
        
        # 按分数排序
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        
        return [item["doc"] for item in scored_docs[:top_k]]


# 全局实例
ai_services = AIServices()

