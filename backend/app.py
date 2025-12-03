from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from pathlib import Path
from datetime import datetime
import uuid
import json
import requests
from readability import Document
import html2text

from sqlalchemy.orm import Session

from db import get_db
from models import Highlight, DocumentStat, MarkdownDoc
from config import DOCS_DIR, VECTOR_STORE_DIR, COLLECTION_NAME, OPENAI_API_KEY, OPENAI_BASE_URL

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.schema import Document as LCDocument

from retrieval import VectorRetrievalService
from rag_pipeline import RAGPipeline


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

# 初始化检索服务和 RAG pipeline
retrieval_service = VectorRetrievalService(
    vectordb=vectordb,
    llm=llm,
    enable_rerank=True,  # 启用 rerank
)

rag_pipeline = RAGPipeline(
    retrieval_service=retrieval_service,
    llm=llm,
)


class QueryRequest(BaseModel):
    question: str
    doc_type: Optional[str] = None  # 文档类型过滤
    k: int = 10  # 初始检索数量
    rerank_k: int = 5  # rerank 后保留数量


class Citation(BaseModel):
    index: int
    source: str
    title: Optional[str] = None
    snippet: str
    doc_id: Optional[str] = None  # Markdown 文档 ID
    page: Optional[int] = None  # 页码


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]


@app.post("/query")
def query_kb(req: QueryRequest):
    """使用新的 RAG pipeline 进行查询"""
    def generate():
        try:
            for result in rag_pipeline.stream_query(
                question=req.question,
                doc_type=req.doc_type,
                k=req.k,
                rerank_k=req.rerank_k,
            ):
                # 转换 citations 格式
                if result["type"] == "citations":
                    citations = [
                        Citation(
                            index=c["index"],
                            source=c["source"],
                            title=c.get("title"),
                            snippet=c["snippet"],
                            doc_id=c.get("doc_id"),
                            page=c.get("page"),
                        ).dict()
                        for c in result["citations"]
                    ]
                    yield f"data: {json.dumps({'type': 'citations', 'citations': citations}, ensure_ascii=False)}\n\n"
                elif result["type"] == "chunk":
                    yield f"data: {json.dumps(result, ensure_ascii=False)}\n\n"
                elif result["type"] == "final":
                    citations = [
                        Citation(
                            index=c["index"],
                            source=c["source"],
                            title=c.get("title"),
                            snippet=c["snippet"],
                            doc_id=c.get("doc_id"),
                            page=c.get("page"),
                        ).dict()
                        for c in result["citations"]
                    ]
                    yield f"data: {json.dumps({'type': 'final', 'answer': result['answer'], 'citations': citations}, ensure_ascii=False)}\n\n"
        except Exception as e:
            # 发送错误信息
            error_result = {
                "type": "final",
                "answer": f"查询失败: {str(e)}",
                "citations": [],
            }
            yield f"data: {json.dumps(error_result, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---- Knowledge Base (docs/ 下的 Markdown 文件阅读 + 阅读次数统计) ----

class KbDocItem(BaseModel):
    source: str
    title: str
    read_count: int


class KbDocDetail(BaseModel):
    source: str
    title: str
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
        read_count = stat_map.get(source, 0)
        items.append(
            KbDocItem(
                source=source,
                title=title,
                read_count=read_count,
            )
        )

    items.sort(key=lambda x: x.title)
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
        content=text,
        read_count=stat.read_count,
    )


# ---- Highlights（用于 KnowledgeBase 页面原文高亮） ----

class HighlightCreate(BaseModel):
    source: str
    page: Optional[int] = None
    selected_text: str
    note: Optional[str] = None


class HighlightOut(BaseModel):
    id: int
    source: str
    page: Optional[int]
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
    content: Optional[str] = ""
    doc_type: Optional[str] = None  # 文档类型


class MarkdownDocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    doc_type: Optional[str] = None  # 文档类型


class MarkdownDocItem(BaseModel):
    id: str
    title: str
    doc_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MarkdownDocDetail(BaseModel):
    id: str
    title: str
    content: str
    doc_type: Optional[str] = None
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

    # 将文档切分为 chunks
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "。", " ", ""],
    )
    
    # 创建临时文档用于切分
    temp_doc = LCDocument(page_content=doc.content)
    chunks = splitter.split_documents([temp_doc])
    
    # 为每个 chunk 添加元数据
    lc_docs = []
    for i, chunk in enumerate(chunks):
        lc_doc = LCDocument(
            page_content=chunk.page_content,
            metadata={
                "source": f"markdown_doc:{doc.id}",
                "doc_id": str(doc.id),
                "title": doc.title,
                "page": None,
                "doc_type": doc.doc_type,  # 添加文档类型
                "chunk_index": i,  # chunk 索引
            },
        )
        lc_docs.append(lc_doc)
    
    if lc_docs:
        vectordb.add_documents(lc_docs)

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
    doc_id = str(uuid.uuid4())
    doc = MarkdownDoc(
        id=doc_id,
        title=req.title or "未命名文档",
        content=req.content or "",
        doc_type=req.doc_type,
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
def get_markdown_doc(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return doc


@app.put("/docs/{doc_id}", response_model=MarkdownDocDetail)
def update_markdown_doc(
    doc_id: str,
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
    if req.content is not None:
        doc.content = req.content
        changed = True
    if req.doc_type is not None:
        doc.doc_type = req.doc_type
        changed = True

    if changed:
        doc.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(doc)
        # 如果内容或类型改变，需要重新同步到向量库
        if req.content is not None or req.doc_type is not None:
            upsert_markdown_doc_to_vectorstore(doc)

    return doc


@app.delete("/docs/{doc_id}")
def delete_markdown_doc(doc_id: str, db: Session = Depends(get_db)):
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


# ---- 网页正文提取 ----

class WebExtractRequest(BaseModel):
    url: str
    title: Optional[str] = None


@app.post("/extract-web", response_model=MarkdownDocDetail)
def extract_web_content(req: WebExtractRequest, db: Session = Depends(get_db)):
    """从网页 URL 提取正文并保存为 Markdown 文档"""
    try:
        # 获取网页内容
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(req.url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 正确处理字符编码
        # 1. 首先尝试从响应头获取编码
        encoding = response.encoding
        
        # 2. 如果响应头没有编码信息，尝试从 HTML meta 标签获取
        if not encoding or encoding.lower() == 'iso-8859-1':
            # 先尝试用 UTF-8 解码一部分内容来查找 charset
            try:
                content_preview = response.content[:5000].decode('utf-8', errors='ignore')
                # 查找 charset 声明
                import re
                charset_match = re.search(r'<meta[^>]*charset=["\']?([^"\'>\s]+)', content_preview, re.IGNORECASE)
                if charset_match:
                    encoding = charset_match.group(1)
                else:
                    encoding = 'utf-8'
            except Exception:
                encoding = 'utf-8'
        
        # 3. 使用检测到的编码解码内容
        try:
            html_content = response.content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            # 如果解码失败，尝试 UTF-8
            try:
                html_content = response.content.decode('utf-8')
            except UnicodeDecodeError:
                # 最后尝试 latin-1（不会失败，但可能产生乱码）
                html_content = response.content.decode('latin-1', errors='replace')

        # 使用 readability 提取正文
        doc = Document(html_content)
        title = doc.title() if not req.title else req.title
        content_html = doc.summary()

        # 使用 html2text 将 HTML 转换为 Markdown
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = False
        h.body_width = 0  # 不限制行宽
        h.unicode_snob = True  # 使用 Unicode
        markdown_content = h.handle(content_html).strip()

        # 添加来源信息
        markdown_content = f"# {title}\n\n**来源**: [{req.url}]({req.url})\n\n---\n\n{markdown_content}"

        # 创建 Markdown 文档
        now = datetime.utcnow()
        doc_id = str(uuid.uuid4())
        doc = MarkdownDoc(
            id=doc_id,
            title=title,
            content=markdown_content,
            doc_type="web",  # 标记为网页类型
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


@app.get("/health")
def health():
    return {"status": "ok"}
