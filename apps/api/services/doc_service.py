"""
文档服务：处理文档与向量库的同步
"""
import logging
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document as LCDocument
from models import MarkdownDoc
from services.vector_store import vectordb


def upsert_markdown_doc_to_vectorstore(doc: MarkdownDoc):
    """将单个在线 Markdown 文档同步到向量库"""
    logger = logging.getLogger(__name__)
    try:
        # 删除文档对应的向量
        vectordb.delete(where={"doc_id": str(doc.id)})
    except Exception:
        # 某些版本不支持 where 删除，可以忽略
        pass

    # 将文档切分为 chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "。", " ", ""],
    )

    # 创建临时文档用于切分
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
                "doc_type": doc.doc_type,
                "chunk_index": i,
            },
        )
        lc_docs.append(lc_doc)

    if lc_docs:
        try:
            vectordb.add_documents(lc_docs)
        except Exception as exc:
            # 外部嵌入服务异常时不要让整个接口失败
            logger.error(
                "向量库同步失败，doc_id=%s，原因=%s",
                doc.id,
                exc,
                exc_info=True,
            )
            return False

    return True

