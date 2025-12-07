"""
评估系统数据模型
"""
from sqlalchemy import Column, Integer, Text, DateTime, String
from datetime import datetime
import uuid
from db import Base


# 评估数据集
class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    knowledge_base_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# 评估数据项
class EvaluationDataItem(Base):
    __tablename__ = "evaluation_data_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String, nullable=False, index=True)
    question = Column(Text, nullable=False)
    ground_truth = Column(Text, nullable=True)
    context_doc_ids = Column(Text, nullable=True)  # JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)


# 评估运行记录
class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    knowledge_base_id = Column(String, nullable=False, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, running, completed, failed
    metrics = Column(Text, nullable=True)  # JSON 格式
    total_items = Column(Integer, nullable=False, default=0)
    completed_items = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


# 评估结果详情
class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, nullable=False, index=True)
    data_item_id = Column(String, nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    context = Column(Text, nullable=True)  # JSON 格式
    metrics = Column(Text, nullable=True)  # JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)

