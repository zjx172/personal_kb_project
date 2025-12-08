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
class HighlightRect(BaseModel):
    x: float
    y: float
    width: float
    height: float


class HighlightCreate(BaseModel):
    source: str
    page: Optional[int] = None
    selected_text: str
    rects: List[HighlightRect] = []
    color: Optional[str] = None
    note: Optional[str] = None


class HighlightOut(BaseModel):
    id: int
    source: str
    page: Optional[int]
    selected_text: str
    rects: List[HighlightRect]
    color: Optional[str]
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


# ---- 分片上传相关 ----
class ChunkUploadInitRequest(BaseModel):
    filename: str
    total_size: int
    chunk_size: int
    title: Optional[str] = None
    knowledge_base_id: Optional[str] = None


class ChunkUploadInitResponse(BaseModel):
    upload_id: str
    chunk_size: int
    total_chunks: int


class ChunkUploadRequest(BaseModel):
    upload_id: str
    chunk_index: int
    chunk_data: bytes  # 实际使用时通过 FormData 传递


class ChunkUploadResponse(BaseModel):
    upload_id: str
    chunk_index: int
    uploaded: bool
    message: str


class ChunkUploadCompleteRequest(BaseModel):
    upload_id: str


class ChunkUploadCompleteResponse(BaseModel):
    task_id: str
    message: str


# ---- 知识库相关 ----
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "document"  # document 或 table
    data_source: Optional[str] = None  # database 或 excel，仅当 type 为 table 时使用
    data_source_config: Optional[dict] = None  # 数据源配置，JSON 格式


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    data_source: Optional[str] = None
    data_source_config: Optional[dict] = None


class KnowledgeBaseOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str
    data_source: Optional[str] = None
    data_source_config: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- 数据源相关 ----
class DataSourceCreate(BaseModel):
    knowledge_base_id: str
    type: str  # database 或 excel
    name: str  # 数据源名称
    config: dict  # 数据源配置


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None


class DataSourceOut(BaseModel):
    id: str
    knowledge_base_id: str
    type: str
    name: str
    config: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataSourceDataRequest(BaseModel):
    """数据源数据请求（带筛选和分页）"""
    filters: Optional[dict] = None  # 筛选条件，格式: {"column_name": "filter_value"}
    page: int = 1  # 页码，从1开始
    page_size: int = 50  # 每页大小


class DataSourceDataResponse(BaseModel):
    """数据源数据响应"""
    data: List[dict]  # 表格数据行
    columns: List[str]  # 列名
    total: int  # 总行数
    page: int  # 当前页码
    page_size: int  # 每页大小
    total_pages: int  # 总页数


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


# ---- 评估相关 ----
class EvaluationDatasetCreate(BaseModel):
    knowledge_base_id: str
    name: str
    description: Optional[str] = None


class EvaluationDatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class EvaluationDatasetOut(BaseModel):
    id: str
    knowledge_base_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EvaluationDataItemCreate(BaseModel):
    dataset_id: str
    question: str
    ground_truth: Optional[str] = None
    context_doc_ids: Optional[List[str]] = None


class EvaluationDataItemUpdate(BaseModel):
    question: Optional[str] = None
    ground_truth: Optional[str] = None
    context_doc_ids: Optional[List[str]] = None


class EvaluationDataItemOut(BaseModel):
    id: str
    dataset_id: str
    question: str
    ground_truth: Optional[str] = None
    context_doc_ids: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRunCreate(BaseModel):
    knowledge_base_id: str
    dataset_id: str


class EvaluationRunOut(BaseModel):
    id: str
    knowledge_base_id: str
    dataset_id: str
    status: str
    metrics: Optional[dict] = None
    total_items: int
    completed_items: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EvaluationResultOut(BaseModel):
    id: str
    run_id: str
    data_item_id: str
    question: str
    answer: Optional[str] = None
    context: Optional[List[str]] = None
    metrics: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRequest(BaseModel):
    """评估请求"""
    questions: List[str]
    ground_truths: Optional[List[str]] = None
    knowledge_base_id: Optional[str] = None


class EvaluationResponse(BaseModel):
    """评估响应"""
    success: bool
    metrics_summary: Optional[dict] = None
    detailed_results: Optional[dict] = None
    total_items: int
    error: Optional[str] = None

