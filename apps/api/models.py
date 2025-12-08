from sqlalchemy import Column, Integer, Text, DateTime, String, JSON
from datetime import datetime
import uuid
from db import Base

# 用户模型
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    picture = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 
# 高亮
# Highlight: 高亮，用于记录文档的阅读次数和最后阅读时间
# source: 文档路径
# page: 页码
# selected_text: 选中文本
# note: 笔记
# created_at: 创建时间
class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)  # 添加用户ID
    source = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    selected_text = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    rects = Column(JSON, nullable=False, default=list)  # 规范化后的坐标
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# 文档统计
# DocumentStat: 文档统计，用于记录文档的阅读次数和最后阅读时间
# user_id: 用户 ID
# source: 文档路径
# read_count: 阅读次数
# last_read_at: 最后阅读时间
class DocumentStat(Base):
    __tablename__ = "document_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    source = Column(Text, nullable=False)
    read_count = Column(Integer, default=0)
    last_read_at = Column(DateTime, default=datetime.utcnow)

# 在线编辑的 Markdown 文档
# MarkdownDoc: 在线编辑的 Markdown 文档，用于记录文档的标题、内容、创建时间和更新时间
# id: 文档 ID
# user_id: 用户 ID
# knowledge_base_id: 所属知识库 ID
# title: 文档标题
# content: 文档内容
# created_at: 创建时间
# updated_at: 更新时间
class MarkdownDoc(Base):
    """在线编辑的 Markdown 文档"""
    __tablename__ = "markdown_docs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)  # 添加用户ID
    knowledge_base_id = Column(String, nullable=False, index=True)  # 所属知识库
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    doc_type = Column(String, nullable=True)  # 文档类型：web, markdown, pdf
    summary = Column(Text, nullable=True)  # 文档摘要
    tags = Column(Text, nullable=True)  # 标签，JSON 格式存储
    pdf_file_path = Column(Text, nullable=True)  # PDF文件路径（当doc_type为pdf时）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# 知识库
# KnowledgeBase: 知识库，用于组织对话和文档
# id: 知识库 ID
# user_id: 用户 ID
# name: 知识库名称
# description: 知识库描述（可选）
# type: 知识库类型（document/table），默认为 document
# data_source: 数据源类型（database/excel），仅当 type 为 table 时使用
# data_source_config: 数据源配置（JSON 格式），存储连接信息等
# created_at: 创建时间
# updated_at: 更新时间
class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String, nullable=False, default="document")  # document 或 table
    data_source = Column(String, nullable=True)  # database 或 excel，仅当 type 为 table 时使用
    data_source_config = Column(Text, nullable=True)  # 数据源配置，JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 对话会话
# Conversation: 对话会话，每次对话是一个会话
# id: 会话 ID
# user_id: 用户 ID
# knowledge_base_id: 所属知识库 ID
# title: 会话标题（自动生成或用户设置）
# created_at: 创建时间
# updated_at: 更新时间
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    knowledge_base_id = Column(String, nullable=False, index=True)  # 所属知识库
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 搜索记录（对话消息记录）
# SearchHistory: 搜索记录，用于记录用户的搜索历史和对话消息
# id: 记录 ID
# user_id: 用户 ID
# conversation_id: 所属对话会话 ID
# query: 搜索关键词（用户问题）
# answer: AI 回答内容
# citations: 引用信息（JSON 格式存储）
# sources_count: 来源数量
# created_at: 创建时间
class SearchHistory(Base):
    __tablename__ = "search_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    conversation_id = Column(String, nullable=False, index=True)  # 所属对话会话
    query = Column(String, nullable=False)
    answer = Column(Text, nullable=True)  # AI 回答
    citations = Column(Text, nullable=True)  # 引用信息，JSON 格式
    sources_count = Column(Integer, nullable=True, default=0)  # 来源数量
    created_at = Column(DateTime, default=datetime.utcnow)

# 评估数据集
# EvaluationDataset: 评估数据集，用于存储评估问题
# id: 数据集 ID
# user_id: 用户 ID
# knowledge_base_id: 所属知识库 ID
# name: 数据集名称
# description: 数据集描述
# created_at: 创建时间
# updated_at: 更新时间
class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    knowledge_base_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 评估数据项
# EvaluationDataItem: 评估数据项，存储单个评估问题
# id: 数据项 ID
# dataset_id: 所属数据集 ID
# question: 问题
# ground_truth: 参考答案（可选）
# context_doc_ids: 相关文档 ID 列表（JSON 格式，用于计算召回率）
# created_at: 创建时间
class EvaluationDataItem(Base):
    __tablename__ = "evaluation_data_items"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String, nullable=False, index=True)
    question = Column(Text, nullable=False)
    ground_truth = Column(Text, nullable=True)  # 参考答案（可选）
    context_doc_ids = Column(Text, nullable=True)  # 相关文档 ID 列表，JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)

# 评估运行记录
# EvaluationRun: 评估运行记录
# id: 运行 ID
# user_id: 用户 ID
# knowledge_base_id: 所属知识库 ID
# dataset_id: 使用的数据集 ID
# status: 运行状态（pending, running, completed, failed）
# metrics: 评估指标结果（JSON 格式）
# total_items: 总评估项数
# completed_items: 已完成项数
# error_message: 错误信息（如果有）
# created_at: 创建时间
# updated_at: 更新时间
# completed_at: 完成时间
class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    knowledge_base_id = Column(String, nullable=False, index=True)
    dataset_id = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, running, completed, failed
    metrics = Column(Text, nullable=True)  # 评估指标结果，JSON 格式
    total_items = Column(Integer, nullable=False, default=0)
    completed_items = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

# 评估结果详情
# EvaluationResult: 评估结果详情，存储每个评估项的详细结果
# id: 结果 ID
# run_id: 所属运行 ID
# data_item_id: 对应的数据项 ID
# question: 问题
# answer: 生成的答案
# context: 检索到的上下文（JSON 格式）
# metrics: 该评估项的指标（JSON 格式）
# created_at: 创建时间
class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String, nullable=False, index=True)
    data_item_id = Column(String, nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    context = Column(Text, nullable=True)  # 检索到的上下文，JSON 格式
    metrics = Column(Text, nullable=True)  # 评估指标，JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)

# 数据源
# DataSource: 数据源，用于表格型知识库
# id: 数据源 ID
# knowledge_base_id: 所属知识库 ID
# type: 数据源类型（database/excel）
# name: 数据源名称
# config: 数据源配置（JSON 格式）
# created_at: 创建时间
# updated_at: 更新时间
class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    knowledge_base_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # database 或 excel
    name = Column(String, nullable=False)  # 数据源名称
    config = Column(Text, nullable=False)  # 数据源配置，JSON 格式
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
