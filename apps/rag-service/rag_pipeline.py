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
1. 只依据上下文作答，不要编造。
2. 如果上下文没有能支持的内容，请回答："知识库中没有相关内容"。
3. 回答中必须使用 [1], [2], [3] 这样的标号引用对应的上下文片段。
4. 引用标号应该紧跟在相关信息后，例如："根据文档[1]，Python 是解释型语言。"
5. 一段话可引用多个文档，例如："根据文档[1][2]，..."
6. 保持回答的专业性和准确性。
7. 上下文会包含标题/来源/score，score 越高通常越相关。"""),
            ("human", """【问题】
{question}

【上下文】
{context}

请根据上下文回答问题，回答里务必使用 [1], [2] 等标号引用对应的上下文片段。如果上下文无法支持回答，请输出："知识库中没有相关内容"。""")
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
            scores = [r.get("score") for r in results if r.get("score") is not None]
            max_score = max(scores) if scores else 0.0
            strict_threshold = 0.4  # 可按需调节

            if max_score < strict_threshold or not results:
                return {
                    **inputs,
                    "context": "",
                    "citations": [],
                    "_no_context": True,
                }
            
            # 重组为结构化上下文
            context_parts = []
            citations = []
            
            for result in results:
                index = result["index"]
                content = result["content"]
                source = result["source"]
                title = result.get("title", "")
                score = result.get("score")
                
                # 构建上下文片段
                context_part = (
                    f"[{index}] 标题: {title or '未知'} | 来源: {source} | score: {score}\n"
                    f"{content}"
                )
                context_parts.append(context_part)
                
                # 构建引用信息
                citations.append({
                    "index": index,
                    "source": source,
                    "title": title,
                    "snippet": content[:200] + "..." if len(content) > 200 else content,
                    "doc_id": result.get("doc_id"),
                    "page": result.get("page"),
                    "score": score,
                })
            
            context = "\n\n".join(context_parts)
            
            return {
                **inputs,
                "context": context,
                "citations": citations,
                "_no_context": False,
            }
        
        # 第二步：生成回答
        def generate_answer(inputs: Dict[str, Any]) -> Dict[str, Any]:
            if inputs.get("_no_context"):
                answer = "知识库中没有相关内容"
                return {**inputs, "answer": answer}
            
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
        scores = [r.get("score") for r in retrieve_result if r.get("score") is not None]
        max_score = max(scores) if scores else 0.0
        strict_threshold = 0.4
        
        # 重组上下文
        context_parts = []
        citations = []
        
        for result in retrieve_result:
            index = result["index"]
            content = result["content"]
            source = result["source"]
            title = result.get("title", "")
            score = result.get("score")
            
            context_part = (
                f"[{index}] 标题: {title or '未知'} | 来源: {source} | score: {score}\n"
                f"{content}"
            )
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
                "score": score,
            })
        
        context = "\n\n".join(context_parts)

        # gating：无足够相关内容时直接返回
        if max_score < strict_threshold or not retrieve_result:
            yield {
                "type": "citations",
                "citations": [],
            }
            yield {
                "type": "final",
                "answer": "知识库中没有相关内容",
                "citations": [],
            }
            return

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

