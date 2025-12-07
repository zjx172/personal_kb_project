from sqlalchemy import Column, Integer, Text, DateTime, String
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
# title: 文档标题
# content: 文档内容
# created_at: 创建时间
# updated_at: 更新时间
class MarkdownDoc(Base):
    """在线编辑的 Markdown 文档"""
    __tablename__ = "markdown_docs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)  # 添加用户ID
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    doc_type = Column(String, nullable=True)  # 文档类型：web, markdown, pdf
    summary = Column(Text, nullable=True)  # 文档摘要
    tags = Column(Text, nullable=True)  # 标签，JSON 格式存储
    pdf_file_path = Column(Text, nullable=True)  # PDF文件路径（当doc_type为pdf时）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# 对话会话
# Conversation: 对话会话，每次对话是一个会话
# id: 会话 ID
# user_id: 用户 ID
# title: 会话标题（自动生成或用户设置）
# created_at: 创建时间
# updated_at: 更新时间
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
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
