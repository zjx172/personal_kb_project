"""
对话相关路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from db import get_db
from models import User, Conversation, SearchHistory
from auth import get_current_user
from schemas import ConversationCreate, ConversationOut, ConversationDetail, ConversationUpdate, SearchHistoryOut

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut)
def create_conversation(
    req: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新对话"""
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

    title = req.title or "新对话"
    conversation = Conversation(
        user_id=current_user.id,
        knowledge_base_id=req.knowledge_base_id,
        title=title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=List[ConversationOut])
def list_conversations(
    knowledge_base_id: Optional[str] = Query(None, description="知识库ID，用于过滤对话"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的对话列表，支持按知识库过滤"""
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    
    if knowledge_base_id:
        # 验证知识库是否存在且属于当前用户
        from models import KnowledgeBase
        knowledge_base = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.id == knowledge_base_id,
                KnowledgeBase.user_id == current_user.id,
            )
            .first()
        )
        if not knowledge_base:
            raise HTTPException(status_code=404, detail="知识库不存在")
        query = query.filter(Conversation.knowledge_base_id == knowledge_base_id)
    
    conversations = query.order_by(Conversation.updated_at.desc()).all()
    return conversations


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取对话详情（包含消息）"""
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

    # 获取对话中的消息
    messages = (
        db.query(SearchHistory)
        .filter(SearchHistory.conversation_id == conversation_id)
        .order_by(SearchHistory.created_at.asc())
        .all()
    )

    message_list = []
    for msg in messages:
        citations = None
        if msg.citations:
            try:
                citations = json.loads(msg.citations)
            except Exception:
                citations = None
        message_list.append(SearchHistoryOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            query=msg.query,
            answer=msg.answer,
            citations=citations,
            sources_count=msg.sources_count,
            created_at=msg.created_at,
        ))

    return ConversationDetail(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=message_list,
    )


@router.put("/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: str,
    req: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新对话标题"""
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

    if req.title:
        conversation.title = req.title
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(conversation)
    return conversation


@router.delete("/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除对话（同时删除对话中的所有消息）"""
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

    # 删除对话中的所有消息
    db.query(SearchHistory).filter(
        SearchHistory.conversation_id == conversation_id
    ).delete()

    # 删除对话
    db.delete(conversation)
    db.commit()
    return {"message": "对话已删除"}

