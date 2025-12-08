"""
知识库相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

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
    # 验证知识库类型
    if req.type not in ["document", "table"]:
        raise HTTPException(status_code=400, detail="知识库类型必须是 document 或 table")
    
    # 创建知识库（不要求立即配置数据源）
    knowledge_base = KnowledgeBase(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        type=req.type,
        data_source=None,  # 数据源在创建后单独配置
        data_source_config=None,
    )
    db.add(knowledge_base)
    db.commit()
    db.refresh(knowledge_base)
    
    # 反序列化数据源配置用于返回
    if knowledge_base.data_source_config:
        knowledge_base.data_source_config = json.loads(knowledge_base.data_source_config)
    
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
    # 反序列化数据源配置
    for kb in knowledge_bases:
        if kb.data_source_config:
            kb.data_source_config = json.loads(kb.data_source_config)
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
    # 反序列化数据源配置
    if knowledge_base.data_source_config:
        knowledge_base.data_source_config = json.loads(knowledge_base.data_source_config)
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
    if req.type is not None:
        if req.type not in ["document", "table"]:
            raise HTTPException(status_code=400, detail="知识库类型必须是 document 或 table")
        knowledge_base.type = req.type
    if req.data_source is not None:
        if knowledge_base.type == "table" and req.data_source not in ["database", "excel"]:
            raise HTTPException(status_code=400, detail="数据源类型必须是 database 或 excel")
        knowledge_base.data_source = req.data_source
    if req.data_source_config is not None:
        knowledge_base.data_source_config = json.dumps(req.data_source_config, ensure_ascii=False) if req.data_source_config else None
    
    knowledge_base.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(knowledge_base)
    
    # 反序列化数据源配置用于返回
    if knowledge_base.data_source_config:
        knowledge_base.data_source_config = json.loads(knowledge_base.data_source_config)
    
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
    
    # 不允许删除默认知识库
    if knowledge_base.name == "默认知识库":
        raise HTTPException(
            status_code=400, 
            detail="默认知识库无法删除"
        )

    # 删除知识库中的所有资源
    from models import Conversation, SearchHistory, MarkdownDoc
    from services.vector_store import vectordb

    # 获取知识库中的所有文档，用于从向量库中删除
    docs = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.knowledge_base_id == knowledge_base_id)
        .all()
    )

    # 从向量库中删除所有文档的向量
    for doc in docs:
        try:
            vectordb.delete(where={"doc_id": str(doc.id)})
        except Exception:
            # 某些版本不支持 where 删除，可以忽略
            pass

    # 删除知识库中的所有对话（级联删除消息）
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

    # 删除知识库中的所有文档
    db.query(MarkdownDoc).filter(
        MarkdownDoc.knowledge_base_id == knowledge_base_id
    ).delete()

    # 删除知识库
    db.delete(knowledge_base)
    db.commit()
    return {"message": "知识库已删除"}

