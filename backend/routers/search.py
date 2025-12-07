"""
搜索相关路由
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json

from db import get_db
from models import User, Conversation, SearchHistory
from auth import get_current_user
from schemas import QueryRequest, Citation
from services.vector_store import (
    hybrid_search_service,
    retrieval_service,
    rag_pipeline,
    llm,
)
from langchain.prompts import ChatPromptTemplate

router = APIRouter(tags=["search"])


@router.post("/query")
def query_kb(
    req: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """使用新的 RAG pipeline 进行查询，支持混合搜索和过滤"""
    # 处理对话 ID
    conversation_id = req.conversation_id
    if not conversation_id:
        # 如果没有提供对话 ID，需要提供知识库 ID 来创建新对话
        if not req.knowledge_base_id:
            raise HTTPException(
                status_code=400,
                detail="创建新对话时需要提供 knowledge_base_id"
            )
        
        # 验证知识库是否存在且属于当前用户
        from models import KnowledgeBase
        knowledge_base = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.id == req.knowledge_base_id,
                KnowledgeBase.user_id == current_user.id,
            )
            .first()
        )
        if not knowledge_base:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 创建新对话
        conversation = Conversation(
            user_id=current_user.id,
            knowledge_base_id=req.knowledge_base_id,
            title=req.question.strip()[:50] if req.question else "新对话",
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        conversation_id = conversation.id
    else:
        # 验证对话是否存在且属于当前用户
        conversation = (
            db.query(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        # 更新对话的更新时间
        conversation.updated_at = datetime.utcnow()
        db.commit()

    # 创建搜索记录（先不保存答案）
    search_history_id = None
    if req.question and req.question.strip():
        search_history = SearchHistory(
            user_id=current_user.id,
            conversation_id=conversation_id,
            query=req.question.strip(),
        )
        db.add(search_history)
        db.commit()
        db.refresh(search_history)
        search_history_id = search_history.id

        # 如果是对话的第一条消息，更新对话标题
        message_count = (
            db.query(SearchHistory)
            .filter(SearchHistory.conversation_id == conversation_id)
            .count()
        )
        if message_count == 1 and (not conversation.title or conversation.title == "新对话"):
            conversation.title = req.question.strip()[:50]
            db.commit()

    def generate():
        nonlocal search_history_id
        final_answer = ""
        final_citations = []
        try:
            # 如果启用关键词搜索或设置了过滤条件，使用混合搜索
            if req.use_keyword_search or req.tags or req.start_date or req.end_date:
                # 使用混合搜索
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

                # 转换为 citations 格式
                citations = []
                context_parts = []

                for result in search_results:
                    chunk_index = result.get("chunk_index")
                    chunk_position = None
                    if chunk_index is not None:
                        chunk_position = f"第 {chunk_index + 1} 段"

                    citations.append({
                        "index": result["index"],
                        "source": result["source"],
                        "title": result.get("title", ""),
                        "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", ""),
                        "doc_id": result.get("doc_id"),
                        "page": result.get("page"),
                        "chunk_index": chunk_index,
                        "chunk_position": chunk_position,
                    })
                    content_preview = result.get("content", "")[:500]
                    context_parts.append(f"[{result['index']}] {content_preview}")

                context = "\n\n".join(context_parts)

                # 先发送 citations
                yield f"data: {json.dumps({'type': 'citations', 'citations': citations}, ensure_ascii=False)}\n\n"

                # 使用 LLM 生成回答
                is_strict_mode = req.rerank_k and req.rerank_k <= 3
                strict_instruction = """严格模式：如果检索到的文档片段与问题的相关性不够高（低于80%），请直接回答"知识库中没有相关内容"，不要强行回答。""" if is_strict_mode else ""

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
                        yield f"data: {json.dumps({'type': 'chunk', 'chunk': content}, ensure_ascii=False)}\n\n"

                final_answer = "".join(answer_chunks)
                final_citations = citations
                yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': citations}, ensure_ascii=False)}\n\n"
            else:
                # 使用原有的 RAG pipeline
                for result in rag_pipeline.stream_query(
                    question=req.question,
                    doc_type=req.doc_type,
                    k=req.k,
                    rerank_k=req.rerank_k,
                ):
                    # 转换 citations 格式
                    if result["type"] == "citations":
                        citations = [
                            Citation(
                                index=c["index"],
                                source=c["source"],
                                title=c.get("title"),
                                snippet=c["snippet"],
                                doc_id=c.get("doc_id"),
                                page=c.get("page"),
                            ).dict()
                            for c in result["citations"]
                        ]
                        yield f"data: {json.dumps({'type': 'citations', 'citations': citations}, ensure_ascii=False)}\n\n"
                    elif result["type"] == "chunk":
                        yield f"data: {json.dumps(result, ensure_ascii=False)}\n\n"
                    elif result["type"] == "final":
                        citations = [
                            Citation(
                                index=c["index"],
                                source=c["source"],
                                title=c.get("title"),
                                snippet=c["snippet"],
                                doc_id=c.get("doc_id"),
                                page=c.get("page"),
                            ).dict()
                            for c in result["citations"]
                        ]
                        final_answer = result["answer"]
                        final_citations = citations
                        yield f"data: {json.dumps({'type': 'final', 'answer': result['answer'], 'citations': citations}, ensure_ascii=False)}\n\n"
        except Exception as e:
            # 发送错误信息
            error_result = {
                "type": "final",
                "answer": f"查询失败: {str(e)}",
                "citations": [],
            }
            yield f"data: {json.dumps(error_result, ensure_ascii=False)}\n\n"
        
        # 保存最终答案到搜索历史
        if search_history_id and final_answer:
            try:
                from db import SessionLocal
                history_db = SessionLocal()
                try:
                    history = history_db.query(SearchHistory).filter(
                        SearchHistory.id == search_history_id
                    ).first()
                    if history:
                        history.answer = final_answer
                        history.citations = json.dumps(final_citations, ensure_ascii=False)
                        history.sources_count = len(final_citations)
                        history_db.commit()
                finally:
                    history_db.close()
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.error(f"保存搜索历史失败: {str(e)}")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

