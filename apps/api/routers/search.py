"""
搜索相关路由
"""
import logging
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from db import get_db
from models import User
from auth import get_current_user
from schemas import QueryRequest
from services.table_query import stream_table_query
from services.doc_query import stream_doc_query
from services import conversation as conversation_service
from services import search_history as search_history_service
from utils.sse import sse_event

router = APIRouter(tags=["search"])


@router.post("/query")
def query_kb(
    req: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """使用新的 RAG pipeline 进行查询，支持混合搜索和过滤"""
    conversation, knowledge_base = conversation_service.ensure_conversation(
        req=req,
        db=db,
        current_user=current_user,
    )
    conversation_id = conversation.id

    search_history_id, is_first_message = search_history_service.create_search_history(
        question=req.question,
        user_id=current_user.id,
        conversation_id=conversation_id,
        db=db,
    )
    if is_first_message and (not conversation.title or conversation.title == "新对话"):
        search_history_service.update_conversation_title(conversation, req.question, db)

    def generate():
        nonlocal search_history_id, knowledge_base
        final_answer = ""
        final_citations = []
        logger = logging.getLogger(__name__)
        try:
            # 检查知识库类型，如果是表格型，使用不同的查询逻辑
            if knowledge_base and knowledge_base.type == "table":
                final_answer, final_citations = yield from stream_table_query(
                    req=req,
                    db=db,
                    knowledge_base=knowledge_base,
                    search_history_id=search_history_id,
                )
            else:
                final_answer, final_citations = yield from stream_doc_query(
                    req=req,
                    db=db,
                    search_history_id=search_history_id,
                )
        except Exception as e:
            # 发送错误信息
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"查询过程中发生异常: {str(e)}\n{error_trace}")
            
            error_message = str(e)
            if '\\"' in error_message or "\\'" in error_message:
                error_message = error_message.replace('\\"', "").replace("\\'", "")
            
            error_result = {
                "type": "final",
                "answer": f"查询失败: {error_message}",
                "citations": [],
            }
            yield sse_event(error_result)
        
        # 保存最终答案到搜索历史
        if search_history_id and final_answer:
            search_history_service.update_history_answer(
                history_id=search_history_id,
                final_answer=final_answer,
                final_citations=final_citations,
            )

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

