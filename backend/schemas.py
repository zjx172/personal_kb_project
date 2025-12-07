"""
API 请求和响应的 Pydantic 模型
"""
from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ---- 任务管理 ----
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskInfo(BaseModel):
    task_id: str
    status: str
    progress: int  # 0-100
    message: str
    result: Optional[dict] = None
    error: Optional[str] = None


# ---- 查询相关 ----
class QueryRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    knowledge_base_id: Optional[str] = None  # 创建新对话时需要提供
    doc_type: Optional[str] = None
    tags: Optional[List[str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    use_keyword_search: bool = False
    k: int = 10
    rerank_k: int = 5


class Citation(BaseModel):
    index: int
    source: str
    title: Optional[str] = None
    snippet: str
    doc_id: Optional[str] = None
    page: Optional[int] = None
    chunk_index: Optional[int] = None
    chunk_position: Optional[str] = None


class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]


# ---- 认证相关 ----
class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---- 知识库文档 ----
class KbDocItem(BaseModel):
    source: str
    title: str
    read_count: int


class KbDocDetail(BaseModel):
    source: str
    title: str
    content: str
    read_count: int


# ---- 高亮 ----
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


# ---- Markdown 文档 ----
class MarkdownDocCreate(BaseModel):
    knowledge_base_id: Optional[str] = None  # 知识库ID，如果不提供则使用默认知识库
    title: str = "未命名文档"
    content: Optional[str] = ""
    doc_type: Optional[str] = None


class MarkdownDocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    doc_type: Optional[str] = None


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


class MarkdownDocDetail(BaseModel):
    id: str
    title: str
    content: str
    doc_type: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    pdf_file_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebExtractRequest(BaseModel):
    url: str
    knowledge_base_id: Optional[str] = None  # 知识库ID，如果不提供则使用默认知识库
    title: Optional[str] = None


class UploadPdfResponse(BaseModel):
    task_id: str
    message: str


# ---- 知识库相关 ----
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class KnowledgeBaseOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- 对话相关 ----
class ConversationCreate(BaseModel):
    knowledge_base_id: str
    title: str = "新对话"


class ConversationOut(BaseModel):
    id: str
    knowledge_base_id: str
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    id: str
    knowledge_base_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List["SearchHistoryOut"]

    class Config:
        from_attributes = True


class ConversationUpdate(BaseModel):
    title: Optional[str] = None


# ---- 搜索历史 ----
class SearchHistoryOut(BaseModel):
    id: int
    conversation_id: str
    query: str
    answer: Optional[str] = None
    citations: Optional[List[dict]] = None
    sources_count: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

