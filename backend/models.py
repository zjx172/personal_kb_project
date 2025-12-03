from sqlalchemy import Column, Integer, Text, DateTime, String
from datetime import datetime
import uuid
from db import Base

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
    user_id = Column(String, nullable=False)
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
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False, default="")
    doc_type = Column(String, nullable=True)  # 文档类型：paper, blog, doc, etc.
    summary = Column(Text, nullable=True)  # 文档摘要
    tags = Column(Text, nullable=True)  # 标签，JSON 格式存储
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
