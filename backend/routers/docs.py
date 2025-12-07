"""
文档相关路由（Markdown 文档管理）
"""
import json
import uuid
import re
from pathlib import Path
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import requests
from readability import Document
import html2text

from db import get_db
from models import User, MarkdownDoc
from auth import get_current_user
from schemas import (
    MarkdownDocCreate,
    MarkdownDocUpdate,
    MarkdownDocItem,
    MarkdownDocDetail,
    WebExtractRequest,
)
from services.doc_service import upsert_markdown_doc_to_vectorstore
from services.vector_store import vectordb
from ai_services import ai_services

router = APIRouter(prefix="/docs", tags=["docs"])


@router.get("/all", response_model=List[MarkdownDocItem])
def list_markdown_docs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有在线 Markdown 文档"""
    rows = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.user_id == current_user.id)
        .order_by(MarkdownDoc.created_at.desc())
        .all()
    )
    # 转换 tags 为列表格式
    result = []
    for doc in rows:
        result.append(
            MarkdownDocItem(
                id=doc.id,
                title=doc.title,
                doc_type=doc.doc_type,
                summary=doc.summary,
                tags=json.loads(doc.tags) if doc.tags else None,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
            )
        )
    return result


@router.post("", response_model=MarkdownDocDetail)
def create_markdown_doc(
    req: MarkdownDocCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建在线 Markdown 文档"""
    now = datetime.utcnow()
    doc_id = str(uuid.uuid4())
    content = req.content or ""

    # 生成摘要和标签（如果内容足够长）
    summary = None
    tags = None
    if content and len(content.strip()) > 50:
        try:
            summary = ai_services.generate_summary(content)
            tags = ai_services.recommend_tags(req.title or "未命名文档", content)
        except Exception as e:
            print(f"生成摘要或标签失败: {e}")

    doc = MarkdownDoc(
        id=doc_id,
        user_id=current_user.id,
        title=req.title or "未命名文档",
        content=content,
        doc_type=req.doc_type,
        summary=summary,
        tags=json.dumps(tags, ensure_ascii=False) if tags else None,
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # 将文档同步到向量库
    upsert_markdown_doc_to_vectorstore(doc)

    result = MarkdownDocDetail(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        summary=doc.summary,
        tags=json.loads(doc.tags) if doc.tags else None,
        pdf_file_path=doc.pdf_file_path,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
    return result


@router.get("/{doc_id}", response_model=MarkdownDocDetail)
def get_markdown_doc(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取在线 Markdown 文档"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    result = MarkdownDocDetail(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        summary=doc.summary,
        tags=json.loads(doc.tags) if doc.tags else None,
        pdf_file_path=doc.pdf_file_path,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
    return result


@router.put("/{doc_id}", response_model=MarkdownDocDetail)
def update_markdown_doc(
    doc_id: str,
    req: MarkdownDocUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新在线 Markdown 文档"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    changed = False
    if req.title is not None:
        doc.title = req.title
        changed = True
    if req.content is not None:
        doc.content = req.content
        changed = True
    if req.doc_type is not None:
        doc.doc_type = req.doc_type
        changed = True

    # 如果内容或类型改变，需要重新同步到向量库
    if changed:
        doc.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(doc)
        # 如果内容或类型改变，需要重新同步到向量库
        if req.content is not None or req.doc_type is not None:
            upsert_markdown_doc_to_vectorstore(doc)

    return doc


@router.delete("/{doc_id}")
def delete_markdown_doc(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除在线 Markdown 文档"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 从向量库中删除
    try:
        vectordb.delete(where={"doc_id": str(doc_id)})
    except Exception:
        # 某些版本不支持 where 删除，可以忽略
        pass

    # 从数据库中删除
    db.delete(doc)
    db.commit()

    return {"message": "文档已删除", "id": doc_id}


@router.post("/extract-web", response_model=MarkdownDocDetail)
def extract_web_content(
    req: WebExtractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """从网页 URL 提取正文并保存为 Markdown 文档"""
    try:
        # 获取网页内容
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(req.url, headers=headers, timeout=30)
        response.raise_for_status()

        # 正确处理字符编码
        encoding = response.encoding
        if not encoding or encoding.lower() == "iso-8859-1":
            try:
                content_preview = response.content[:5000].decode("utf-8", errors="ignore")
                charset_match = re.search(
                    r'<meta[^>]*charset=["\']?([^"\'>\s]+)', content_preview, re.IGNORECASE
                )
                if charset_match:
                    encoding = charset_match.group(1)
                else:
                    encoding = "utf-8"
            except Exception:
                encoding = "utf-8"

        # 使用检测到的编码解码内容
        try:
            html_content = response.content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            try:
                html_content = response.content.decode("utf-8")
            except UnicodeDecodeError:
                html_content = response.content.decode("latin-1", errors="replace")

        # 使用 readability 提取正文
        doc = Document(html_content)
        title = doc.title() if not req.title else req.title
        content_html = doc.summary()

        # 使用 html2text 将 HTML 转换为 Markdown
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = False
        h.body_width = 0
        h.unicode_snob = True
        markdown_content = h.handle(content_html).strip()

        # 添加来源信息
        markdown_content = (
            f"# {title}\n\n**来源**: [{req.url}]({req.url})\n\n---\n\n{markdown_content}"
        )

        # 创建 Markdown 文档
        now = datetime.utcnow()
        doc_id = str(uuid.uuid4())
        doc = MarkdownDoc(
            id=doc_id,
            user_id=current_user.id,
            title=title,
            content=markdown_content,
            doc_type="web",
            created_at=now,
            updated_at=now,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # 同步到向量库
        upsert_markdown_doc_to_vectorstore(doc)

        return doc

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"无法获取网页内容: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"提取网页内容失败: {str(e)}")


@router.get("/{doc_id}/pdf")
def get_pdf_file(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取PDF文件用于预览"""
    doc = (
        db.query(MarkdownDoc)
        .filter(
            MarkdownDoc.id == doc_id,
            MarkdownDoc.user_id == current_user.id,
            MarkdownDoc.doc_type == "pdf",
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="PDF文档不存在")

    if not doc.pdf_file_path:
        raise HTTPException(status_code=404, detail="PDF文件路径不存在")

    pdf_path = Path(doc.pdf_file_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF文件不存在")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=Path(doc.pdf_file_path).name,
    )


@router.post("/{doc_id}/generate-summary")
def generate_doc_summary(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """为文档生成摘要"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    if not doc.content or len(doc.content.strip()) < 50:
        raise HTTPException(status_code=400, detail="文档内容太短，无法生成摘要")

    summary = ai_services.generate_summary(doc.content)
    doc.summary = summary
    db.commit()
    db.refresh(doc)

    return {"summary": summary}


@router.post("/{doc_id}/recommend-tags")
def recommend_doc_tags(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """为文档推荐标签"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    if not doc.content:
        raise HTTPException(status_code=400, detail="文档内容为空")

    existing_tags = json.loads(doc.tags) if doc.tags else None
    tags = ai_services.recommend_tags(doc.title, doc.content, existing_tags)
    doc.tags = json.dumps(tags, ensure_ascii=False)
    db.commit()
    db.refresh(doc)

    return {"tags": tags}


@router.get("/{doc_id}/related")
def get_related_docs(
    doc_id: str,
    top_k: int = Query(5),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取相关文档推荐"""
    doc = (
        db.query(MarkdownDoc)
        .filter(MarkdownDoc.id == doc_id, MarkdownDoc.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 获取当前用户的所有文档
    all_docs = db.query(MarkdownDoc).filter(MarkdownDoc.user_id == current_user.id).all()
    docs_list = [
        {
            "id": d.id,
            "title": d.title,
            "content": d.content,
            "summary": d.summary,
        }
        for d in all_docs
    ]

    # 查找相关文档
    related = ai_services.find_related_docs(
        doc.content,
        doc.id,
        docs_list,
        top_k=top_k,
    )

    # 转换为响应格式
    result = []
    for r in related:
        result.append(
            {
                "id": r["id"],
                "title": r["title"],
                "summary": r.get("summary"),
            }
        )

    return {"related_docs": result}


@router.get("/graph")
def get_docs_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取文档关系图谱数据"""
    docs = db.query(MarkdownDoc).filter(MarkdownDoc.user_id == current_user.id).all()

    nodes = []
    edges = []

    # 创建节点
    for doc in docs:
        nodes.append(
            {
                "id": doc.id,
                "label": doc.title,
                "type": doc.doc_type or "doc",
                "tags": json.loads(doc.tags) if doc.tags else [],
            }
        )

    # 创建边（基于标签相似度）
    for i, doc1 in enumerate(docs):
        if not doc1.tags:
            continue
        tags1 = set(json.loads(doc1.tags))

        for doc2 in docs[i + 1 :]:
            if not doc2.tags:
                continue
            tags2 = set(json.loads(doc2.tags))

            # 计算标签交集
            common_tags = tags1 & tags2
            if common_tags:
                # 创建边，权重基于共同标签数量
                edges.append(
                    {
                        "source": doc1.id,
                        "target": doc2.id,
                        "weight": len(common_tags),
                        "tags": list(common_tags),
                    }
                )

    return {
        "nodes": nodes,
        "edges": edges,
    }

