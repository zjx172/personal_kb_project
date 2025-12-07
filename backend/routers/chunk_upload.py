"""
分片上传相关路由
支持大文件分片上传，提高上传成功率和用户体验
"""
import logging
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime

from db import get_db
from models import User
from auth import get_current_user
from schemas import (
    ChunkUploadInitRequest,
    ChunkUploadInitResponse,
    ChunkUploadResponse,
    ChunkUploadCompleteRequest,
    ChunkUploadCompleteResponse,
)
from services.storage import storage
from tasks import update_task, TaskStatus
import asyncio
from routers.pdf import process_pdf_extraction

router = APIRouter(tags=["chunk-upload"])
logger = logging.getLogger(__name__)

# 临时存储上传信息（生产环境应使用 Redis）
upload_sessions = {}


@router.post("/chunk-upload/init", response_model=ChunkUploadInitResponse)
async def init_chunk_upload(
    req: ChunkUploadInitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """初始化分片上传"""
    # 验证文件类型
    if not req.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="只支持PDF文件")
    
    # 生成上传ID
    upload_id = str(uuid.uuid4())
    
    # 计算总分片数
    total_chunks = (req.total_size + req.chunk_size - 1) // req.chunk_size
    
    # 保存上传会话信息
    upload_sessions[upload_id] = {
        "user_id": current_user.id,
        "filename": req.filename,
        "total_size": req.total_size,
        "chunk_size": req.chunk_size,
        "total_chunks": total_chunks,
        "uploaded_chunks": set(),
        "title": req.title,
        "knowledge_base_id": req.knowledge_base_id,
        "created_at": datetime.utcnow(),
    }
    
    logger.info(
        f"初始化分片上传: upload_id={upload_id}, "
        f"filename={req.filename}, total_chunks={total_chunks}"
    )
    
    return ChunkUploadInitResponse(
        upload_id=upload_id,
        chunk_size=req.chunk_size,
        total_chunks=total_chunks,
    )


@router.post("/chunk-upload/upload", response_model=ChunkUploadResponse)
async def upload_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """上传单个分片"""
    # 验证上传会话
    if upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="上传会话不存在或已过期")
    
    session = upload_sessions[upload_id]
    
    # 验证用户
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此上传会话")
    
    # 验证分片索引
    if chunk_index < 0 or chunk_index >= session["total_chunks"]:
        raise HTTPException(status_code=400, detail="无效的分片索引")
    
    # 检查是否已上传
    if chunk_index in session["uploaded_chunks"]:
        logger.warning(f"分片 {chunk_index} 已上传，跳过")
        return ChunkUploadResponse(
            upload_id=upload_id,
            chunk_index=chunk_index,
            uploaded=True,
            message="分片已存在",
        )
    
    try:
        # 读取分片数据
        chunk_data = await chunk.read()
        
        # 上传分片
        success = storage.upload_chunk(
            upload_id=upload_id,
            chunk_index=chunk_index,
            chunk_data=chunk_data,
        )
        
        if success:
            session["uploaded_chunks"].add(chunk_index)
            logger.info(
                f"分片上传成功: upload_id={upload_id}, "
                f"chunk_index={chunk_index}, size={len(chunk_data)}"
            )
            return ChunkUploadResponse(
                upload_id=upload_id,
                chunk_index=chunk_index,
                uploaded=True,
                message="分片上传成功",
            )
        else:
            raise HTTPException(status_code=500, detail="分片上传失败")
    
    except Exception as e:
        logger.error(f"分片上传失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"分片上传失败: {str(e)}")


@router.post("/chunk-upload/complete", response_model=ChunkUploadCompleteResponse)
async def complete_chunk_upload(
    req: ChunkUploadCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """完成分片上传，合并所有分片并启动处理任务"""
    # 验证上传会话
    if req.upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="上传会话不存在或已过期")
    
    session = upload_sessions[req.upload_id]
    
    # 验证用户
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此上传会话")
    
    # 检查所有分片是否已上传
    total_chunks = session["total_chunks"]
    uploaded_chunks = len(session["uploaded_chunks"])
    
    if uploaded_chunks != total_chunks:
        raise HTTPException(
            status_code=400,
            detail=f"分片未完整，已上传 {uploaded_chunks}/{total_chunks}",
        )
    
    try:
        # 生成最终文件路径
        doc_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        file_extension = Path(session["filename"]).suffix
        file_filename = f"{doc_id}{file_extension}"
        
        # 根据文件类型确定存储路径和 content type
        def get_file_type_from_filename(filename: str) -> str:
            """根据文件名获取文件类型"""
            ext = Path(filename).suffix.lower()
            if ext == ".pdf":
                return "pdf"
            elif ext in [".docx"]:
                return "docx"
            elif ext in [".ppt", ".pptx"]:
                return "ppt"
            elif ext in [".md", ".markdown"]:
                return "markdown"
            else:
                return "unknown"
        
        file_type = get_file_type_from_filename(session["filename"])
        if file_type == "pdf":
            final_path = f"pdfs/{file_filename}"
            content_type = "application/pdf"
        else:
            final_path = f"files/{file_filename}"
            content_type_map = {
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "ppt": "application/vnd.ms-powerpoint",
                "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "markdown": "text/markdown",
            }
            content_type = content_type_map.get(file_type, "application/octet-stream")
        
        # 合并所有分片
        file_url = storage.complete_chunk_upload(
            upload_id=req.upload_id,
            final_path=final_path,
            total_chunks=total_chunks,
            content_type=content_type,
        )
        
        # 清理上传会话
        del upload_sessions[req.upload_id]
        
        # 初始化任务
        await update_task(task_id, TaskStatus.PENDING, 0, "文件上传完成，开始处理...")
        
        # 获取文件路径（用于本地存储）
        file_path = None
        if hasattr(storage, 'base_dir'):
            file_path = Path(file_url)
        else:
            file_path = None
        
        # 根据文件类型选择处理函数
        if file_type == "pdf":
            # 使用 PDF 处理函数
            asyncio.create_task(
                process_pdf_extraction(
                    task_id=task_id,
                    pdf_path=file_path,
                    pdf_url=file_url,
                    doc_id=doc_id,
                    user_id=current_user.id,
                    knowledge_base_id=session.get("knowledge_base_id"),
                    title=session.get("title"),
                    filename=session["filename"],
                )
            )
        else:
            # 使用通用文件处理函数（延迟导入避免循环依赖）
            from routers.file_upload import process_file_extraction
            asyncio.create_task(
                process_file_extraction(
                    task_id=task_id,
                    file_path=file_path,
                    file_url=file_url,
                    doc_id=doc_id,
                    user_id=current_user.id,
                    knowledge_base_id=session.get("knowledge_base_id"),
                    title=session.get("title"),
                    filename=session["filename"],
                )
            )
        
        logger.info(
            f"分片上传完成: upload_id={req.upload_id}, "
            f"task_id={task_id}, file={final_path}"
        )
        
        return ChunkUploadCompleteResponse(
            task_id=task_id,
            message="文件上传完成，正在后台处理...",
        )
    
    except Exception as e:
        logger.error(f"完成分片上传失败: {e}", exc_info=True)
        # 清理分片
        storage.cleanup_chunks(req.upload_id)
        # 清理会话
        if req.upload_id in upload_sessions:
            del upload_sessions[req.upload_id]
        raise HTTPException(status_code=500, detail=f"完成上传失败: {str(e)}")


@router.delete("/chunk-upload/{upload_id}")
async def cancel_chunk_upload(
    upload_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消分片上传，清理已上传的分片"""
    if upload_id not in upload_sessions:
        raise HTTPException(status_code=404, detail="上传会话不存在")
    
    session = upload_sessions[upload_id]
    
    # 验证用户
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此上传会话")
    
    # 清理分片
    storage.cleanup_chunks(upload_id)
    
    # 清理会话
    del upload_sessions[upload_id]
    
    logger.info(f"已取消分片上传: upload_id={upload_id}")
    
    return {"message": "上传已取消"}

