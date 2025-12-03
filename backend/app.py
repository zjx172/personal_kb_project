from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session

from db import get_db
from models import Highlight, DocumentStat
from config import DOCS_DIR, VECTOR_STORE_DIR, COLLECTION_NAME, OPENAI_API_KEY, OPENAI_BASE_URL

from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.prompts import ChatPromptTemplate


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
            answer="知识库中没有相关内容。",            citations=[],
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


# ---- Knowledge Base (Markdown) ----

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


# ---- Highlights ----

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
    return HighlightOut(
        id=h.id,
        source=h.source,
        page=h.page,
        topic=h.topic,
        selected_text=h.selected_text,
        note=h.note,
        created_at=h.created_at,
    )


@app.get("/highlights", response_model=List[HighlightOut])
def list_highlights(
    source: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Highlight)
    if source:
        q = q.filter(Highlight.source == source)
    rows = q.order_by(Highlight.created_at.desc()).all()
    return [
        HighlightOut(
            id=h.id,
            source=h.source,
            page=h.page,
            topic=h.topic,
            selected_text=h.selected_text,
            note=h.note,
            created_at=h.created_at,
        )
        for h in rows
    ]


@app.get("/health")
def health():
    return {"status": "ok"}
