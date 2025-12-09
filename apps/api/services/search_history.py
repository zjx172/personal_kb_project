import json
import logging
from db import SessionLocal
from models import SearchHistory


def create_search_history(question, user_id, conversation_id, db):
    """
    创建搜索历史记录，返回 history_id。
    顺带在首条消息时更新对话标题。
    """
    if not question or not question.strip():
        return None, False

    search_history = SearchHistory(
        user_id=user_id,
        conversation_id=conversation_id,
        query=question.strip(),
    )
    db.add(search_history)
    db.commit()
    db.refresh(search_history)
    history_id = search_history.id

    message_count = (
        db.query(SearchHistory)
        .filter(SearchHistory.conversation_id == conversation_id)
        .count()
    )
    if message_count == 1:
        return history_id, True
    return history_id, False


def update_conversation_title(conversation, question, db):
    if conversation and question and question.strip():
        conversation.title = question.strip()[:50]
        db.commit()


def update_history_answer(history_id, final_answer, final_citations):
    """
    独立 Session 保存答案，避免流式时连接占用。
    """
    if not history_id or not final_answer:
        return

    logger = logging.getLogger(__name__)
    try:
        history_db = SessionLocal()
        try:
            history = history_db.query(SearchHistory).filter(
                SearchHistory.id == history_id
            ).first()
            if history:
                history.answer = final_answer
                history.citations = json.dumps(final_citations, ensure_ascii=False)
                history.sources_count = len(final_citations)
                history_db.commit()
        finally:
            history_db.close()
    except Exception as e:
        logger.error(f"保存搜索历史失败: {str(e)}")

