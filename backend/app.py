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
from ai_services import ai_services
from hybrid_search import HybridSearchService


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

# 初始化 OpenAI Embeddings
# Embeddings用于将文本转换为向量
embeddings = OpenAIEmbeddings(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="text-embedding-3-large",
)

# 初始化向量库
# Chroma向量库是用于存储和检索向量的数据库
vectordb = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=VECTOR_STORE_DIR,
)

# 初始化 LLM
llm = ChatOpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
    model="gpt-4o-mini",
    temperature=0.2,
)

# 初始化检索服务和 RAG pipeline
# 检索服务是用于检索向量库中的文档
# VectorRetrievalService是用于检索向量库中的文档的类
# enable_rerank=True 启用 rerank
# rerank是用于重排序的模型
retrieval_service = VectorRetrievalService(
    vectordb=vectordb,
    llm=llm,
    enable_rerank=True,  # 启用 rerank
)

rag_pipeline = RAGPipeline(
    retrieval_service=retrieval_service,
    llm=llm,
)

# 初始化混合搜索服务
hybrid_search_service = HybridSearchService(vectordb=vectordb)


class QueryRequest(BaseModel):
    question: str
    doc_type: Optional[str] = None  # 文档类型过滤
    tags: Optional[List[str]] = None  # 标签过滤
    start_date: Optional[str] = None  # 开始日期过滤（YYYY-MM-DD）
    end_date: Optional[str] = None  # 结束日期过滤（YYYY-MM-DD）
    use_keyword_search: bool = False  # 是否使用关键词搜索
    k: int = 10  # 初始检索数量
    rerank_k: int = 5  # rerank 后保留数量

class Citation(BaseModel):
    # 引用标号
    index: int
    # 引用来源
    source: str
    # 引用标题
    title: Optional[str] = None
    # 引用片段
    snippet: str
    # 引用文档 ID
    doc_id: Optional[str] = None  # Markdown 文档 ID
    # 引用页码
    page: Optional[int] = None  
    # 文档片段索引
    chunk_index: Optional[int] = None  
    # 文档片段位置描述
    chunk_position: Optional[str] = None  


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]


@app.post("/query")
def query_kb(req: QueryRequest, db: Session = Depends(get_db)):
    """使用新的 RAG pipeline 进行查询，支持混合搜索和过滤"""
    def generate():
        try:
            # 如果启用关键词搜索或设置了过滤条件，使用混合搜索
            if req.use_keyword_search or req.tags or req.start_date or req.end_date:
                # 使用混合搜索
                search_results = hybrid_search_service.hybrid_search(
                    query=req.question,
                    db=db,
                    retrieval_service=retrieval_service,
                    doc_type=req.doc_type,
                    tags=req.tags,
                    start_date=req.start_date,
                    end_date=req.end_date,
                    k=req.k,
                )
                
                # 转换为 citations 格式
                citations = []
                context_parts = []
                
                for result in search_results:
                    chunk_index = result.get("chunk_index")
                    chunk_position = None
                    if chunk_index is not None:
                        chunk_position = f"第 {chunk_index + 1} 段"
                    
                    citations.append({
                        "index": result["index"],
                        "source": result["source"],
                        "title": result.get("title", ""),
                        "snippet": result.get("content", "")[:200] + "..." if len(result.get("content", "")) > 200 else result.get("content", ""),
                        "doc_id": result.get("doc_id"),
                        "page": result.get("page"),
                        "chunk_index": chunk_index,
                        "chunk_position": chunk_position,
                    })
                    content_preview = result.get("content", "")[:500]
                    context_parts.append(f"[{result['index']}] {content_preview}")
                
                context = "\n\n".join(context_parts)
                
                # 先发送 citations
                yield f"data: {json.dumps({'type': 'citations', 'citations': citations}, ensure_ascii=False)}\n\n"
                
                # 使用 LLM 生成回答
                from langchain.prompts import ChatPromptTemplate
                # 根据 rerank_k 判断是否为严格模式
                is_strict_mode = req.rerank_k and req.rerank_k <= 3
                strict_instruction = """严格模式：如果检索到的文档片段与问题的相关性不够高（低于80%），请直接回答"知识库中没有相关内容"，不要强行回答。""" if is_strict_mode else ""
                
                prompt = ChatPromptTemplate.from_messages([
                    ("system", f"""你是一个技术学习助手，只能根据【上下文】回答问题。

要求：
1. 优先使用上下文中的信息，不要凭空编造。
2. 如果上下文没有相关信息或相关性不够高，请明确说明"知识库中没有相关内容"。
3. 只有当上下文中的信息与问题高度相关时，才给出答案。如果相关性不够高，请直接说"知识库中没有相关内容"。
4. 回答中必须使用 [1], [2], [3] 这样的标号引用对应的上下文片段。
5. 每个引用标号对应上下文中的一个文档片段。
6. 引用标号应该紧跟在相关信息的后面。
7. 保持回答的专业性和准确性。
{strict_instruction}"""),
                    ("human", """【问题】
{question}

【上下文】
{context}

请根据上下文回答问题。如果上下文中的信息与问题高度相关（相关性≥80%），请给出答案并在回答中使用 [1], [2] 等标号引用对应的上下文片段。如果相关性不够高，请直接回答"知识库中没有相关内容"。""")
                ])
                
                messages = prompt.format_messages(question=req.question, context=context)
                answer_chunks = []
                for chunk in llm.stream(messages):
                    # hasattr(chunk, "content") 判断 chunk 是否包含 content 属性
                    if hasattr(chunk, "content") and chunk.content:
                        content = chunk.content
                        answer_chunks.append(content)
                        yield f"data: {json.dumps({'type': 'chunk', 'chunk': content}, ensure_ascii=False)}\n\n"
                
                final_answer = "".join(answer_chunks)
                yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': citations}, ensure_ascii=False)}\n\n"
            else:
                # 使用原有的 RAG pipeline
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
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 在线 Markdown 文档详情
# MarkdownDocDetail: 在线 Markdown 文档详情
# id: 文档 ID
# title: 文档标题
# content: 文档内容
# doc_type: 文档类型
# summary: 文档摘要
# tags: 文档标签
# created_at: 创建时间
class MarkdownDocDetail(BaseModel):
    id: str
    title: str
    content: str
    doc_type: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    
    # 允许 Pydantic 模型从对象属性（如 SQLAlchemy ORM 对象）创建实例，
    # 简化了数据库对象到 API 响应模型的转换。
    class Config:
        from_attributes = True


# 将单个在线 Markdown 文档同步到向量库
# doc: 在线 Markdown 文档
def upsert_markdown_doc_to_vectorstore(doc: MarkdownDoc):
    """将单个在线 Markdown 文档同步到向量库。"""
    try:
        # 删除文档对应的向量
        vectordb.delete(where={"doc_id": str(doc.id)})
    except Exception:
        # 某些版本不支持 where 删除，可以忽略
        pass

    # 将文档切分为 chunks
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    # 创建文本分割器
    # chunk_size: 每个 chunk 的大小
    # chunk_overlap: 每个 chunk 的 overlap 大小
    # separators: 分割符
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "。", " ", ""],
    )
    
    # 创建临时文档用于切分
    # LCDocument是LangChain的文档类
    temp_doc = LCDocument(page_content=doc.content)
    # 切分文档
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
    # 转换 tags 为列表格式
    result = []
    for doc in rows:
        result.append(MarkdownDocItem(
            id=doc.id,
            title=doc.title,
            doc_type=doc.doc_type,
            summary=doc.summary,
            tags=json.loads(doc.tags) if doc.tags else None,
            created_at=doc.created_at,
            updated_at=doc.updated_at,
        ))
    return result

# 创建在线 Markdown 文档
@app.post("/docs", response_model=MarkdownDocDetail)
def create_markdown_doc(req: MarkdownDocCreate, db: Session = Depends(get_db)):
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
        title=req.title or "未命名文档",
        content=content,
        doc_type=req.doc_type,
        summary=summary,
        # 将 tags 转换为 JSON 字符串
        # ensure_ascii=False 确保中文不转义
        # 如果 tags 为 None，则不转换
        tags=json.dumps(tags, ensure_ascii=False) if tags else None,
        # 创建时间
        created_at=now,
        # 更新时间
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


    result = MarkdownDocDetail(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        summary=doc.summary,
        # 转换 tags 为列表格式返回
        tags=json.loads(doc.tags) if doc.tags else None,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
    return result

# 获取在线 Markdown 文档
# doc_id: 文档 ID
# db: 数据库会话
# response_model: 响应模型
# MarkdownDocDetail: 在线 Markdown 文档详情
@app.get("/docs/{doc_id}", response_model=MarkdownDocDetail)
def get_markdown_doc(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    # 转换 tags 为列表格式
    result = MarkdownDocDetail(
        id=doc.id,
        title=doc.title,
        content=doc.content,
        doc_type=doc.doc_type,
        summary=doc.summary,
        tags=json.loads(doc.tags) if doc.tags else None,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )
    return result


# 更新在线 Markdown 文档
# doc_id: 文档 ID
# req: 更新请求
# db: 数据库会话
# response_model: 响应模型
# MarkdownDocDetail: 在线 Markdown 文档详情
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

    # 如果内容或类型改变，需要重新同步到向量库
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


# ---- 智能功能 API ----

@app.post("/docs/{doc_id}/generate-summary")
def generate_doc_summary(doc_id: str, db: Session = Depends(get_db)):
    """为文档生成摘要"""
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    if not doc.content or len(doc.content.strip()) < 50:
        raise HTTPException(status_code=400, detail="文档内容太短，无法生成摘要")
    
    summary = ai_services.generate_summary(doc.content)
    doc.summary = summary
    db.commit()
    db.refresh(doc)
    
    return {"summary": summary}


@app.post("/docs/{doc_id}/recommend-tags")
def recommend_doc_tags(doc_id: str, db: Session = Depends(get_db)):
    """为文档推荐标签"""
    doc = db.query(MarkdownDoc).get(doc_id)
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


@app.get("/docs/{doc_id}/related")
def get_related_docs(doc_id: str, top_k: int = Query(5), db: Session = Depends(get_db)):
    """获取相关文档推荐"""
    doc = db.query(MarkdownDoc).get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    # 获取所有文档
    all_docs = db.query(MarkdownDoc).all()
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
        result.append({
            "id": r["id"],
            "title": r["title"],
            "summary": r.get("summary"),
        })
    
    return {"related_docs": result}


@app.get("/docs/graph")
def get_docs_graph(db: Session = Depends(get_db)):
    """获取文档关系图谱数据"""
    docs = db.query(MarkdownDoc).all()
    
    nodes = []
    edges = []
    
    # 创建节点
    for doc in docs:
        nodes.append({
            "id": doc.id,
            "label": doc.title,
            "type": doc.doc_type or "doc",
            "tags": json.loads(doc.tags) if doc.tags else [],
        })
    
    # 创建边（基于标签相似度）
    for i, doc1 in enumerate(docs):
        if not doc1.tags:
            continue
        tags1 = set(json.loads(doc1.tags))
        
        for doc2 in docs[i+1:]:
            if not doc2.tags:
                continue
            tags2 = set(json.loads(doc2.tags))
            
            # 计算标签交集
            common_tags = tags1 & tags2
            if common_tags:
                # 创建边，权重基于共同标签数量
                edges.append({
                    "source": doc1.id,
                    "target": doc2.id,
                    "weight": len(common_tags),
                    "tags": list(common_tags),
                })
    
    return {
        "nodes": nodes,
        "edges": edges,
    }
