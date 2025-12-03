from sqlalchemy import Column, Integer, Text, DateTime, String
from datetime import datetime
from db import Base


class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(Text, nullable=False)
    page = Column(Integer, nullable=True)
    topic = Column(String, nullable=True)
    selected_text = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentStat(Base):
    __tablename__ = "document_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    source = Column(Text, nullable=False)
    read_count = Column(Integer, default=0)
    last_read_at = Column(DateTime, default=datetime.utcnow)
