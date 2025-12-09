import logging
from typing import List, Tuple

from langchain.prompts import ChatPromptTemplate

from services.vector_store import (
    hybrid_search_service,
    retrieval_service,
    rag_pipeline,
    llm,
)
from utils.citations import (
    citations_from_search_results,
    citations_from_rag_items,
)
from utils.sse import sse_event, chunk_event


def stream_doc_query(req, db, search_history_id=None) -> Tuple[str, List[dict]]:
    """
    文档型知识库的查询流。返回 (final_answer, final_citations)。
    """
    logger = logging.getLogger(__name__)
    final_answer = ""
    final_citations: List[dict] = []

    try:
        # 使用混合搜索
        if req.use_keyword_search or req.tags or req.start_date or req.end_date:
            search_results = hybrid_search_service.hybrid_search(
                query=req.question,
                db=db,
                retrieval_service=retrieval_service,
                doc_type=req.doc_type,
                tags=req.tags,
                start_date=req.start_date,
                end_date=req.end_date,
                k=req.k,
            )

            citations = citations_from_search_results(search_results)
            context_parts = []
            for result in search_results:
                content_preview = result.get("content", "")[:500]
                context_parts.append(f"[{result['index']}] {content_preview}")
            context = "\n\n".join(context_parts)

            yield sse_event({"type": "citations", "citations": citations})

            is_strict_mode = req.rerank_k and req.rerank_k <= 3
            strict_instruction = (
                """严格模式：如果检索到的文档片段与问题的相关性不够高（低于80%），请直接回答"知识库中没有相关内容"，不要强行回答。"""
                if is_strict_mode
                else ""
            )

            prompt = ChatPromptTemplate.from_messages([
                ("system", f"""你是一个技术学习助手，只能根据【上下文】回答问题。

要求：
1. 优先使用上下文中的信息，不要凭空编造。
2. 如果上下文没有相关信息或相关性不够高，请明确说明"知识库中没有相关内容"。
3. 只有当上下文中的信息与问题高度相关时，才给出答案。如果相关性不够高，请直接说"知识库中没有相关内容"。
4. 回答中必须使用 [1], [2], [3] 这样的标号引用对应的上下文片段。
5. 每个引用标号对应上下文中的一个文档片段。
6. 引用标号应该紧跟在相关信息的后面。
7. 保持回答的专业性和准确性。
{strict_instruction}"""),
                ("human", """【问题】
{question}

【上下文】
{context}

请根据上下文回答问题。如果上下文中的信息与问题高度相关（相关性≥80%），请给出答案并在回答中使用 [1], [2] 等标号引用对应的上下文片段。如果相关性不够高，请直接回答"知识库中没有相关内容"。""")
            ])

            messages = prompt.format_messages(question=req.question, context=context)
            answer_chunks = []
            for chunk in llm.stream(messages):
                if hasattr(chunk, "content") and chunk.content:
                    content = chunk.content
                    answer_chunks.append(content)
                    yield chunk_event(content)

            final_answer = "".join(answer_chunks)
            final_citations = citations
            yield sse_event({"type": "final", "answer": final_answer, "citations": citations})
            return final_answer, final_citations

        # 使用 RAG pipeline
        for result in rag_pipeline.stream_query(
            question=req.question,
            doc_type=req.doc_type,
            k=req.k,
            rerank_k=req.rerank_k,
        ):
            if result["type"] == "citations":
                citations = citations_from_rag_items(result["citations"])
                yield sse_event({"type": "citations", "citations": citations})
            elif result["type"] == "chunk":
                yield sse_event(result)
            elif result["type"] == "final":
                citations = citations_from_rag_items(result["citations"])
                final_answer = result["answer"]
                final_citations = citations
                yield sse_event({"type": "final", "answer": final_answer, "citations": citations})

        return final_answer, final_citations
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        logger.error(f"文档型查询异常: {str(e)}\n{error_trace}")
        error_message = str(e)
        if '\\"' in error_message or "\\'" in error_message:
            error_message = error_message.replace('\\"', "").replace("\\'", "")

        error_result = {
            "type": "final",
            "answer": f"查询失败: {error_message}",
            "citations": [],
        }
        yield sse_event(error_result)
        return error_result["answer"], []

