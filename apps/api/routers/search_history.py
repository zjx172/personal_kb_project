"""
搜索历史路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import json

from db import get_db
from models import User, SearchHistory
from auth import get_current_user
from schemas import SearchHistoryOut

router = APIRouter(prefix="/search-history", tags=["search-history"])


@router.get("", response_model=List[SearchHistoryOut])
def list_search_history(
    limit: int = Query(20, description="返回数量限制"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的搜索历史记录（对话消息）"""
    rows = (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for row in rows:
        citations = None
        if row.citations:
            try:
                citations = json.loads(row.citations)
            except Exception:
                citations = None
        result.append(SearchHistoryOut(
            id=row.id,
            conversation_id=row.conversation_id,
            query=row.query,
            answer=row.answer,
            citations=citations,
            sources_count=row.sources_count,
            created_at=row.created_at,
        ))
    return result


@router.delete("/{history_id}")
def delete_search_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除指定的搜索记录"""
    history = (
        db.query(SearchHistory)
        .filter(SearchHistory.id == history_id, SearchHistory.user_id == current_user.id)
        .first()
    )
    if not history:
        raise HTTPException(status_code=404, detail="搜索记录不存在")

    db.delete(history)
    db.commit()
    return {"message": "搜索记录已删除"}


@router.delete("")
def clear_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """清空当前用户的所有搜索记录"""
    db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).delete()
    db.commit()
    return {"message": "所有搜索记录已清空"}

