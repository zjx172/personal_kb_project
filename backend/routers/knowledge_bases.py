"""
知识库相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from db import get_db
from models import User, KnowledgeBase
from auth import get_current_user
from schemas import (
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseOut,
)

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge-bases"])


@router.post("", response_model=KnowledgeBaseOut)
def create_knowledge_base(
    req: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新知识库"""
    knowledge_base = KnowledgeBase(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
    )
    db.add(knowledge_base)
    db.commit()
    db.refresh(knowledge_base)
    return knowledge_base


@router.get("", response_model=List[KnowledgeBaseOut])
def list_knowledge_bases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的知识库列表"""
    knowledge_bases = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.user_id == current_user.id)
        .order_by(KnowledgeBase.updated_at.desc())
        .all()
    )
    return knowledge_bases


@router.get("/{knowledge_base_id}", response_model=KnowledgeBaseOut)
def get_knowledge_base(
    knowledge_base_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取知识库详情"""
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
    return knowledge_base


@router.put("/{knowledge_base_id}", response_model=KnowledgeBaseOut)
def update_knowledge_base(
    knowledge_base_id: str,
    req: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新知识库"""
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

    if req.name is not None:
        knowledge_base.name = req.name
    if req.description is not None:
        knowledge_base.description = req.description
    knowledge_base.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(knowledge_base)
    return knowledge_base


@router.delete("/{knowledge_base_id}")
def delete_knowledge_base(
    knowledge_base_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除知识库（同时删除知识库中的所有对话）"""
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

    # 删除知识库中的所有对话（级联删除消息）
    from models import Conversation, SearchHistory

    conversations = (
        db.query(Conversation)
        .filter(Conversation.knowledge_base_id == knowledge_base_id)
        .all()
    )
    for conversation in conversations:
        # 删除对话中的所有消息
        db.query(SearchHistory).filter(
            SearchHistory.conversation_id == conversation.id
        ).delete()
        # 删除对话
        db.delete(conversation)

    # 删除知识库
    db.delete(knowledge_base)
    db.commit()
    return {"message": "知识库已删除"}

