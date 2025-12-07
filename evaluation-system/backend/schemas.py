"""
API 请求和响应的 Pydantic 模型
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# 评估数据集
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


# 评估数据项
class EvaluationDataItemCreate(BaseModel):
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


# 评估运行
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


# 评估结果
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


# 快速评估
class QuickEvaluationRequest(BaseModel):
    questions: List[str]
    ground_truths: Optional[List[str]] = None
    knowledge_base_id: Optional[str] = None


class QuickEvaluationResponse(BaseModel):
    success: bool
    metrics_summary: Optional[dict] = None
    detailed_results: Optional[dict] = None
    total_items: int
    error: Optional[str] = None

