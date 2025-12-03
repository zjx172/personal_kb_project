from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session

from db import get_db
from models import Highlight, DocumentStat, MarkdownDoc
from config import DOCS_DIR, VECTOR_STORE_DIR, COLLECTION_NAME, OPENAI_API_KEY, OPENAI_BASE_URL

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document as LCDocument


app = FastAPI(title="Personal KB Backend")
# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 前端开发服务器地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- LangChain / Vector Store ----

embeddings = OpenAIEmbeddings(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="text-embedding-3-large",
)

vectordb = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=VECTOR_STORE_DIR,
)

llm = ChatOpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="gpt-4.1-mini",
    temperature=0.2,
)

answer_prompt = ChatPromptTemplate.from_template(
    """你是一个技术学习助手，只能根据【上下文】回答问题。

【问题】
{question}

【上下文】
{context}

要求：
1. 优先使用上下文中的信息，不要凭空编造。
2. 如果上下文没有相关信息，请明确说明“知识库中没有相关内容”。
3. 回答中用 [1], [2] 这样的标号引用对应的上下文片段。
"""
)


class QueryRequest(BaseModel):
    question: str


class Citation(BaseModel):
    index: int
    source: str
    snippet: str


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]


@app.post("/query", response_model=QueryResponse)
def query_kb(req: QueryRequest):
    retriever = vectordb.as_retriever(search_kwargs={"k": 5})
    docs = retriever.get_relevant_documents(req.question)

    if not docs:
        return QueryResponse(
            answer="知识库中没有相关内容。",
            citations=[],
        )

    context_parts = []
    citations: List[Citation] = []
    for i, d in enumerate(docs, start=1):
        context_parts.append(f"[{i}] {d.page_content}")
        citations.append(
            Citation(
                index=i,
                source=str(d.metadata.get("source", "unknown")),
                snippet=d.page_content[:200],
            )
        )

    context = "\n\n".join(context_parts)
    chain = answer_prompt | llm
    resp = chain.invoke({"question": req.question, "context": context})

    return QueryResponse(answer=resp.content, citations=citations)


# ---- Knowledge Base (docs/ 下的 Markdown 文件阅读 + 阅读次数统计) ----

def detect_topic(path: Path) -> str:
    parts = path.parts
    if "docs" in parts:
        idx = parts.index("docs")
        if idx + 1 < len(parts) - 1:
            return parts[idx + 1]
    return "general"


class KbDocItem(BaseModel):
    source: str
    title: str
    topic: str
    read_count: int


class KbDocDetail(BaseModel):
    source: str
    title: str
    topic: str
    content: str
    read_count: int


@app.get("/kb/docs", response_model=List[KbDocItem])
def list_kb_docs(db: Session = Depends(get_db)):
    user_id = "default_user"
    stats = (
        db.query(DocumentStat)
        .filter(DocumentStat.user_id == user_id)
        .all()
    )
    stat_map = {s.source: s.read_count for s in stats}

    items: List[KbDocItem] = []
    root = Path(DOCS_DIR)
    for path in root.rglob("*.md"):
        source = str(path)
        title = path.stem
        try:
            text = path.read_text(encoding="utf-8")
            for line in text.splitlines():
                if line.strip().startswith("#"):
                    title = line.lstrip("#").strip() or title
                    break
        except Exception:
            pass
        topic = detect_topic(path)
        read_count = stat_map.get(source, 0)
        items.append(
            KbDocItem(
                source=source,
                title=title,
                topic=topic,
                read_count=read_count,
            )
        )

    items.sort(key=lambda x: (x.topic, x.title))
    return items


@app.get("/kb/doc", response_model=KbDocDetail)
def get_kb_doc(
    source: str = Query(..., description="文档路径（/kb/docs 返回的 source）"),
    db: Session = Depends(get_db),
):
    user_id = "default_user"
    path = Path(source)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文档不存在")

    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        raise HTTPException(status_code=500, detail="读取文档失败")

    title = path.stem
    for line in text.splitlines():
        if line.strip().startswith("#"):
            title = line.lstrip("#").strip() or title
            break

    topic = detect_topic(path)

    stat = (
        db.query(DocumentStat)
        .filter_by(user_id=user_id, source=source)
        .first()
    )
    if stat is None:
        stat = DocumentStat(
            user_id=user_id,
            source=source,
            read_count=1,
            last_read_at=datetime.utcnow(),
        )
        db.add(stat)
    else:
        stat.read_count += 1
        stat.last_read_at = datetime.utcnow()
    db.commit()
    db.refresh(stat)

    return KbDocDetail(
        source=source,
        title=title,
        topic=topic,
        content=text,
        read_count=stat.read_count,
    )


# ---- Highlights（用于 KnowledgeBase 页面原文高亮） ----

class HighlightCreate(BaseModel):
    source: str
    page: Optional[int] = None
    topic: Optional[str] = None
    selected_text: str
    note: Optional[str] = None


class HighlightOut(BaseModel):
    id: int
    source: str
    page: Optional[int]
    topic: Optional[str]
    selected_text: str
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@app.post("/highlights", response_model=HighlightOut)
def create_highlight(req: HighlightCreate, db: Session = Depends(get_db)):
    h = Highlight(
        source=req.source,
        page=req.page,
        topic=req.topic,
        selected_text=req.selected_text,
        note=req.note,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@app.get("/highlights", response_model=List[HighlightOut])
def list_highlights(
    source: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Highlight)
    if source:
        q = q.filter(Highlight.source == source)
    rows = q.order_by(Highlight.created_at.desc()).all()
    return rows


# ---- MarkdownDocs 在线编辑（飞书文档风格） ----

class MarkdownDocCreate(BaseModel):
    title: str = "未命名文档"
    topic: Optional[str] = "general"
    content: Optional[str] = ""


class MarkdownDocUpdate(BaseModel):
    title: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None


class MarkdownDocItem(BaseModel):
    id: int
    title: str
    topic: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarkdownDocDetail(BaseModel):
    id: int
    title: str
    topic: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def upsert_markdown_doc_to_vectorstore(doc: MarkdownDoc):
    """将单个在线 Markdown 文档同步到向量库。"""
    try:
        vectordb.delete(where={"doc_id": str(doc.id)})
    except Exception:
        # 某些版本不支持 where 删除，可以忽略
        pass

    lc_doc = LCDocument(
        page_content=doc.content,
        metadata={
            "source": f"markdown_doc:{doc.id}",
            "topic": doc.topic,
            "doc_id": str(doc.id),
            "title": doc.title,
            "page": None,
        },
    )
    vectordb.add_documents([lc_doc])

# 获取所有在线 Markdown 文档
# Depends(get_db) 是一个依赖注入函数，用于获取数据库会话
@app.get("/all/docs", response_model=List[MarkdownDocItem])
def list_markdown_docs(db: Session = Depends(get_db)):
    # 查询所有在线 Markdown 文档，并按创建时间降序排序
    rows = (
        db.query(MarkdownDoc)
        .order_by(MarkdownDoc.created_at.desc())
        .all()
    )
    # 返回所有在线 Markdown 文档
    return rows

# 创建在线 Markdown 文档
@app.post("/docs", response_model=MarkdownDocDetail)
def create_markdown_doc(req: MarkdownDocCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    doc = MarkdownDoc(
        title=req.title or "未命名文档",
        topic=(req.topic or "general"),
        content=req.content or "",
        created_at=now,
        updated_at=now,
    )
    # 添加文档到数据库
    db.add(doc)
    # 提交事务
    db.commit()
    # 刷新文档
    db.refresh(doc)

    # 将文档同步到向量库
    upsert_markdown_doc_to_vectorstore(doc)

    return doc


@app.get("/docs/{doc_id}", response_model=MarkdownDocDetail)
def get_markdown_doc(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


@app.put("/docs/{doc_id}", response_model=MarkdownDocDetail)
def update_markdown_doc(
    doc_id: int,
    req: MarkdownDocUpdate,
    db: Session = Depends(get_db),
):
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    changed = False
    if req.title is not None:
        doc.title = req.title
        changed = True
    if req.topic is not None:
        doc.topic = req.topic
        changed = True
    if req.content is not None:
        doc.content = req.content
        changed = True

    if changed:
        doc.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(doc)
        upsert_markdown_doc_to_vectorstore(doc)

    return doc


@app.delete("/docs/{doc_id}")
def delete_markdown_doc(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(MarkdownDoc).get(doc_id)
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


@app.get("/health")
def health():
    return {"status": "ok"}
