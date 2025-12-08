"""
高亮相关路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from db import get_db
from models import User, Highlight
from auth import get_current_user
from schemas import HighlightCreate, HighlightOut

router = APIRouter(prefix="/highlights", tags=["highlights"])


@router.post("", response_model=HighlightOut)
def create_highlight(
    req: HighlightCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rects = [r.dict() for r in req.rects] if req.rects else []

    h = Highlight(
        user_id=current_user.id,
        source=req.source,
        page=req.page,
        selected_text=req.selected_text,
        note=req.note,
        rects=rects,
        color=req.color,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.get("", response_model=List[HighlightOut])
def list_highlights(
    source: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Highlight).filter(Highlight.user_id == current_user.id)
    if source:
        q = q.filter(Highlight.source == source)
    rows = q.order_by(Highlight.created_at.desc()).all()
    return rows


@router.delete("/{highlight_id}", status_code=204)
def delete_highlight(
    highlight_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    h = (
        db.query(Highlight)
        .filter(Highlight.id == highlight_id, Highlight.user_id == current_user.id)
        .first()
    )
    if not h:
        raise HTTPException(status_code=404, detail="Highlight not found")

    db.delete(h)
    db.commit()
