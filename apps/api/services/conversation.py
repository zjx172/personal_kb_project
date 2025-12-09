from datetime import datetime
from fastapi import HTTPException

from models import Conversation, KnowledgeBase


def ensure_conversation(req, db, current_user):
    """
    校验/创建对话，返回 (conversation, knowledge_base)。
    """
    conversation_id = req.conversation_id
    knowledge_base = None

    if not conversation_id:
        if not req.knowledge_base_id:
            raise HTTPException(
                status_code=400,
                detail="创建新对话时需要提供 knowledge_base_id",
            )

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

        conversation.updated_at = datetime.utcnow()
        db.commit()

        knowledge_base = (
            db.query(KnowledgeBase)
            .filter(KnowledgeBase.id == conversation.knowledge_base_id)
            .first()
        )
        if not knowledge_base:
            raise HTTPException(status_code=404, detail="知识库不存在")

    return conversation, knowledge_base

