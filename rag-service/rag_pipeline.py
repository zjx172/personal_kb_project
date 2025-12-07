"""
基于 LangChain Runnable 的 RAG Pipeline
将检索文档重组为结构化上下文，并生成带引用标注的回答
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# 兼容相对导入和绝对导入
try:
    from .retrieval import VectorRetrievalService
except ImportError:
    from retrieval import VectorRetrievalService


class RAGPipeline:
    """RAG Pipeline，使用 LangChain Runnable 构建"""
    
    def __init__(
        self,
        retrieval_service: VectorRetrievalService,
        llm: ChatOpenAI,
    ):
        self.retrieval_service = retrieval_service
        self.llm = llm
        
        # 构建 prompt 模板
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", """你是一个技术学习助手，只能根据【上下文】回答问题。

要求：
1. 优先使用上下文中的信息，不要凭空编造。
2. 如果上下文没有相关信息或相关性不够高，请明确说明"知识库中没有相关内容"。
3. 只有当上下文中的信息与问题高度相关时，才给出答案。如果相关性不够高，请直接说"知识库中没有相关内容"。
4. 回答中必须使用 [1], [2], [3] 这样的标号引用对应的上下文片段。
5. 每个引用标号对应上下文中的一个文档片段。
6. 引用标号应该紧跟在相关信息的后面，例如："根据文档[1]，Python 是一种解释型语言。"
7. 如果一段话涉及多个文档，可以同时引用多个标号，例如："根据文档[1][2]，..."
8. 保持回答的专业性和准确性。
9. 严格模式：如果检索到的文档片段与问题的相关性不够高（低于80%），请直接回答"知识库中没有相关内容"，不要强行回答。"""),
            ("human", """【问题】
{question}

【上下文】
{context}

请根据上下文回答问题。如果上下文中的信息与问题高度相关（相关性≥80%），请给出答案并在回答中使用 [1], [2] 等标号引用对应的上下文片段。如果相关性不够高，请直接回答"知识库中没有相关内容"。""")
        ])
        
        # 构建 pipeline
        self.chain = self._build_chain()
    
    def _build_chain(self):
        """构建 RAG chain"""
        # 第一步：检索文档
        def retrieve_docs(inputs: Dict[str, Any]) -> Dict[str, Any]:
            query = inputs["question"]
            doc_type = inputs.get("doc_type")
            
            # 检索文档
            results = self.retrieval_service.retrieve_with_metadata(
                query=query,
                k=inputs.get("k", 10),
                doc_type=doc_type,
                rerank_k=inputs.get("rerank_k", 5),
            )
            
            # 重组为结构化上下文
            context_parts = []
            citations = []
            
            for result in results:
                index = result["index"]
                content = result["content"]
                source = result["source"]
                title = result.get("title", "")
                
                # 构建上下文片段
                context_part = f"[{index}] {content}"
                context_parts.append(context_part)
                
                # 构建引用信息
                citations.append({
                    "index": index,
                    "source": source,
                    "title": title,
                    "snippet": content[:200] + "..." if len(content) > 200 else content,
                    "doc_id": result.get("doc_id"),
                    "page": result.get("page"),
                })
            
            context = "\n\n".join(context_parts)
            
            return {
                **inputs,
                "context": context,
                "citations": citations,
            }
        
        # 第二步：生成回答
        def generate_answer(inputs: Dict[str, Any]) -> Dict[str, Any]:
            question = inputs["question"]
            context = inputs["context"]
            
            # 使用 LLM 生成回答
            messages = self.prompt_template.format_messages(
                question=question,
                context=context,
            )
            
            response = self.llm.invoke(messages)
            answer = response.content
            
            return {
                **inputs,
                "answer": answer,
            }
        
        # 组合成 pipeline
        chain = (
            RunnablePassthrough()
            | RunnableLambda(retrieve_docs)
            | RunnableLambda(generate_answer)
        )
        
        return chain
    
    def query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ) -> Dict[str, Any]:
        """
        执行查询
        
        Returns:
            {
                "answer": str,
                "citations": List[Dict],
            }
        """
        inputs = {
            "question": question,
            "doc_type": doc_type,
            "k": k,
            "rerank_k": rerank_k,
        }
        
        result = self.chain.invoke(inputs)
        
        return {
            "answer": result["answer"],
            "citations": result["citations"],
        }
    
    def stream_query(
        self,
        question: str,
        doc_type: Optional[str] = None,
        k: int = 10,
        rerank_k: int = 5,
    ):
        """
        流式查询
        
        Yields:
            {
                "type": "citations" | "chunk" | "final",
                "citations": List[Dict] (仅 type="citations" 或 "final"),
                "chunk": str (仅 type="chunk"),
                "answer": str (仅 type="final"),
            }
        """
        # 先检索文档
        retrieve_result = self.retrieval_service.retrieve_with_metadata(
            query=question,
            k=k,
            doc_type=doc_type,
            rerank_k=rerank_k,
        )
        
        # 重组上下文
        context_parts = []
        citations = []
        
        for result in retrieve_result:
            index = result["index"]
            content = result["content"]
            source = result["source"]
            title = result.get("title", "")
            
            context_part = f"[{index}] {content}"
            context_parts.append(context_part)
            
            chunk_index = result.get("chunk_index")
            chunk_position = None
            if chunk_index is not None:
                chunk_position = f"第 {chunk_index + 1} 段"  # chunk_index 从 0 开始，显示时 +1
            
            citations.append({
                "index": index,
                "source": source,
                "title": title,
                "snippet": content[:200] + "..." if len(content) > 200 else content,
                "doc_id": result.get("doc_id"),
                "page": result.get("page"),
                "chunk_index": chunk_index,
                "chunk_position": chunk_position,
            })
        
        context = "\n\n".join(context_parts)
        
        # 先发送 citations
        yield {
            "type": "citations",
            "citations": citations,
        }
        
        # 流式生成回答
        messages = self.prompt_template.format_messages(
            question=question,
            context=context,
        )
        
        answer_chunks = []
        # 流式生成回答
        for chunk in self.llm.stream(messages):
            if hasattr(chunk, "content") and chunk.content:
                content = chunk.content
                answer_chunks.append(content)
                yield {
                    "type": "chunk",
                    "chunk": content,
                }
        
        # 发送最终结果
        final_answer = "".join(answer_chunks)
        yield {
            "type": "final",
            "answer": final_answer,
            "citations": citations,
        }

