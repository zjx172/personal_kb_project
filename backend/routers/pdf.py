"""
PDF 相关路由
"""
import asyncio
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime

from db import get_db, SessionLocal
from models import User, MarkdownDoc
from auth import get_current_user
from schemas import UploadPdfResponse
from config import BASE_DIR
from tasks import update_task, TaskStatus
from services.doc_service import upsert_markdown_doc_to_vectorstore

router = APIRouter(tags=["pdf"])
logger = logging.getLogger(__name__)


async def process_pdf_extraction(
    task_id: str,
    pdf_path: Path,
    doc_id: str,
    user_id: str,
    title: Optional[str],
    filename: str,
):
    """后台任务：处理PDF提取"""
    try:
        await update_task(task_id, TaskStatus.PROCESSING, 10, "开始提取PDF文本内容...")

        # 提取PDF文本内容
        pdf_text = ""
        pdf_docs = None
        total_pages = 0

        # 尝试使用 PyPDFLoader，如果失败则使用 pypdf 直接处理
        try:
            from langchain_community.document_loaders import PyPDFLoader
            loader = PyPDFLoader(str(pdf_path))
            logger.info(f"PyPDFLoader初始化成功，文件路径: {pdf_path}")
            pdf_docs = loader.load()
            total_pages = len(pdf_docs)
            logger.info(f"PDF加载成功，共 {total_pages} 页")

            # 逐页提取文本并更新进度
            text_parts = []
            for i, doc in enumerate(pdf_docs):
                text_parts.append(doc.page_content)
                progress = 10 + int((i + 1) / total_pages * 60)  # 10-70%
                await update_task(
                    task_id,
                    TaskStatus.PROCESSING,
                    progress,
                    f"正在提取第 {i+1}/{total_pages} 页...",
                )

            pdf_text = "\n\n".join(text_parts)
        except Exception as load_error:
            logger.warning(f"PyPDFLoader加载失败，尝试使用pypdf: {str(load_error)}")
            # 如果 PyPDFLoader 失败，使用 pypdf 直接处理
            try:
                import pypdf

                with open(pdf_path, "rb") as pdf_file:
                    pdf_reader = pypdf.PdfReader(pdf_file)
                    total_pages = len(pdf_reader.pages)
                    logger.info(f"使用pypdf加载PDF，共 {total_pages} 页")
                    text_parts = []
                    for i, page in enumerate(pdf_reader.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                text_parts.append(page_text)
                            progress = 10 + int((i + 1) / total_pages * 60)  # 10-70%
                            await update_task(
                                task_id,
                                TaskStatus.PROCESSING,
                                progress,
                                f"正在提取第 {i+1}/{total_pages} 页...",
                            )
                        except Exception as page_error:
                            logger.warning(f"提取第 {i+1} 页文本失败: {str(page_error)}")
                    pdf_text = "\n\n".join(text_parts)
                    logger.info(f"使用pypdf提取文本完成，文本长度: {len(pdf_text)} 字符")
            except Exception as pypdf_error:
                logger.error(f"pypdf加载也失败: {str(pypdf_error)}", exc_info=True)
                raise Exception(
                    f"PDF文本提取失败: PyPDFLoader错误={str(load_error)}, pypdf错误={str(pypdf_error)}"
                )

        logger.info(f"PDF文本提取完成，文本长度: {len(pdf_text)} 字符")

        await update_task(task_id, TaskStatus.PROCESSING, 70, "文本提取完成，正在保存文档...")

        # 使用文件名或第一页内容的前100个字符作为标题
        if not title:
            if pdf_docs and pdf_docs[0].page_content:
                # 尝试从第一页提取标题（前100个字符）
                first_page_text = pdf_docs[0].page_content[:100].strip()
                title = (
                    first_page_text.split("\n")[0][:50]
                    if first_page_text
                    else Path(filename).stem
                )
            else:
                title = Path(filename).stem

        logger.info(f"文档标题: {title}")

        # 创建Markdown文档记录
        now = datetime.utcnow()
        db = SessionLocal()
        try:
            doc = MarkdownDoc(
                id=doc_id,
                user_id=user_id,
                title=title,
                content=pdf_text,  # 存储提取的文本内容
                doc_type="pdf",
                pdf_file_path=str(pdf_path),  # 存储PDF文件路径
                created_at=now,
                updated_at=now,
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            logger.info(f"文档已保存到数据库，ID: {doc_id}")

            await update_task(
                task_id, TaskStatus.PROCESSING, 85, "文档已保存，正在同步到向量库..."
            )

            # 同步到向量库（在线程池中执行，避免阻塞事件循环）
            try:
                await update_task(
                    task_id, TaskStatus.PROCESSING, 90, "正在同步到向量库（这可能需要一些时间）..."
                )
                # 将同步操作放到线程池中执行，避免阻塞
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None, 
                    upsert_markdown_doc_to_vectorstore, 
                    doc
                )
                logger.info("文档已同步到向量库")
            except Exception as vector_error:
                logger.error(f"向量库同步失败: {str(vector_error)}", exc_info=True)
                # 向量库同步失败不影响文档保存，只记录错误

            # 返回文档详情
            result = {
                "id": doc.id,
                "title": doc.title,
                "content": doc.content,
                "doc_type": doc.doc_type,
                "summary": doc.summary,
                "tags": None,  # 暂时不处理 tags
                "pdf_file_path": doc.pdf_file_path,
                "created_at": doc.created_at.isoformat(),
                "updated_at": doc.updated_at.isoformat(),
            }

            await update_task(task_id, TaskStatus.COMPLETED, 100, "PDF提取完成！", result=result)
            logger.info(f"PDF处理成功，文档ID: {doc_id}")
        finally:
            db.close()

    except Exception as e:
        logger.error(f"PDF处理失败: {str(e)}", exc_info=True)
        # 如果出错，删除已保存的文件
        if pdf_path and pdf_path.exists():
            try:
                pdf_path.unlink()
                logger.info(f"已删除失败的文件: {pdf_path}")
            except Exception as cleanup_error:
                logger.error(f"清理文件失败: {str(cleanup_error)}")
        await update_task(task_id, TaskStatus.FAILED, 0, f"处理失败: {str(e)}", error=str(e))


@router.post("/upload-pdf", response_model=UploadPdfResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传PDF文件并启动后台提取任务"""
    # 验证文件类型
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        logger.warning(f"无效的文件类型: {file.filename}")
        raise HTTPException(status_code=400, detail="只支持PDF文件")

    logger.info(f"开始上传PDF文件: {file.filename}, 用户: {current_user.id}")

    pdf_path = None
    try:
        # 创建PDF存储目录
        pdf_dir = Path(BASE_DIR) / "uploads" / "pdfs"
        pdf_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"PDF存储目录: {pdf_dir}")

        # 生成唯一文件名和任务ID
        doc_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        pdf_filename = f"{doc_id}{file_extension}"
        pdf_path = pdf_dir / pdf_filename

        logger.info(f"保存PDF文件到: {pdf_path}")

        # 初始化任务
        await update_task(task_id, TaskStatus.PENDING, 0, "准备上传PDF文件...")

        # 保存PDF文件
        file.file.seek(0)  # 确保文件指针在开头
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 验证文件是否成功保存
        if not pdf_path.exists():
            raise Exception(f"文件保存失败: {pdf_path}")

        file_size = pdf_path.stat().st_size
        logger.info(f"PDF文件已保存，大小: {file_size} 字节")

        await update_task(task_id, TaskStatus.PROCESSING, 5, "文件上传成功，开始处理...")

        # 启动后台任务
        asyncio.create_task(
            process_pdf_extraction(
                task_id=task_id,
                pdf_path=pdf_path,
                doc_id=doc_id,
                user_id=current_user.id,
                title=title,
                filename=file.filename,
            )
        )

        return UploadPdfResponse(
            task_id=task_id, message="PDF文件已上传，正在后台处理..."
        )

    except HTTPException:
        # 重新抛出HTTP异常
        raise
    except Exception as e:
        logger.error(f"PDF上传失败: {str(e)}", exc_info=True)
        # 如果出错，删除已保存的文件
        if pdf_path and pdf_path.exists():
            try:
                pdf_path.unlink()
                logger.info(f"已删除失败的文件: {pdf_path}")
            except Exception as cleanup_error:
                logger.error(f"清理文件失败: {str(cleanup_error)}")
        raise HTTPException(status_code=500, detail=f"上传PDF失败: {str(e)}")

# 注意：PDF 文件预览路由在 routers/docs.py 中处理（@router.get("/{doc_id}/pdf")）

