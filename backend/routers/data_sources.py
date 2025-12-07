"""
数据源相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from db import get_db
from models import User, KnowledgeBase, DataSource
from auth import get_current_user
from schemas import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceOut,
)

router = APIRouter(prefix="/data-sources", tags=["data-sources"])


@router.post("", response_model=DataSourceOut)
def create_data_source(
    req: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建数据源"""
    # 验证知识库是否存在且属于当前用户
    kb = (
        db.query(KnowledgeBase)
        .filter(
            KnowledgeBase.id == req.knowledge_base_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 验证数据源类型
    if req.type not in ["database", "excel"]:
        raise HTTPException(status_code=400, detail="数据源类型必须是 database 或 excel")
    
    # 序列化配置
    config_json = json.dumps(req.config, ensure_ascii=False)
    
    data_source = DataSource(
        knowledge_base_id=req.knowledge_base_id,
        type=req.type,
        name=req.name,
        config=config_json,
    )
    db.add(data_source)
    db.commit()
    db.refresh(data_source)
    
    # 反序列化配置用于返回
    data_source.config = json.loads(data_source.config)
    
    return data_source


@router.get("", response_model=List[DataSourceOut])
def list_data_sources(
    knowledge_base_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取知识库的数据源列表"""
    # 验证知识库是否存在且属于当前用户
    kb = (
        db.query(KnowledgeBase)
        .filter(
            KnowledgeBase.id == knowledge_base_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    data_sources = (
        db.query(DataSource)
        .filter(DataSource.knowledge_base_id == knowledge_base_id)
        .order_by(DataSource.created_at.desc())
        .all()
    )
    
    # 反序列化配置
    for ds in data_sources:
        ds.config = json.loads(ds.config)
    
    return data_sources


@router.get("/{data_source_id}", response_model=DataSourceOut)
def get_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取数据源详情"""
    data_source = (
        db.query(DataSource)
        .join(KnowledgeBase)
        .filter(
            DataSource.id == data_source_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    # 反序列化配置
    data_source.config = json.loads(data_source.config)
    
    return data_source


@router.put("/{data_source_id}", response_model=DataSourceOut)
def update_data_source(
    data_source_id: str,
    req: DataSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新数据源"""
    data_source = (
        db.query(DataSource)
        .join(KnowledgeBase)
        .filter(
            DataSource.id == data_source_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    if req.name is not None:
        data_source.name = req.name
    if req.config is not None:
        data_source.config = json.dumps(req.config, ensure_ascii=False)
    
    data_source.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(data_source)
    
    # 反序列化配置用于返回
    data_source.config = json.loads(data_source.config)
    
    return data_source


@router.delete("/{data_source_id}")
def delete_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除数据源"""
    data_source = (
        db.query(DataSource)
        .join(KnowledgeBase)
        .filter(
            DataSource.id == data_source_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    db.delete(data_source)
    db.commit()
    return {"message": "数据源已删除"}

