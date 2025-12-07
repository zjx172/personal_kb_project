"""
数据源相关路由
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json
import math

from db import get_db
from models import User, KnowledgeBase, DataSource
from auth import get_current_user
from schemas import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceOut,
    DataSourceDataRequest,
    DataSourceDataResponse,
)

router = APIRouter(prefix="/data-sources", tags=["data-sources"])


@router.post("", response_model=DataSourceOut)
def create_data_source(
    req: DataSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建数据源"""
    # 验证知识库是否存在且属于当前用户
    kb = (
        db.query(KnowledgeBase)
        .filter(
            KnowledgeBase.id == req.knowledge_base_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    # 验证数据源类型
    # excel 类型可以用于 Excel 文件或手动创建的表格数据
    if req.type not in ["database", "excel"]:
        raise HTTPException(status_code=400, detail="数据源类型必须是 database 或 excel")
    
    # 序列化配置
    config_json = json.dumps(req.config, ensure_ascii=False)
    
    # 创建数据源，确保所有必需字段都设置
    import uuid
    from datetime import datetime
    
    data_source = DataSource(
        id=str(uuid.uuid4()),
        knowledge_base_id=req.knowledge_base_id,
        type=req.type,
        name=req.name,
        config=config_json,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(data_source)
    db.commit()
    db.refresh(data_source)
    
    # 反序列化配置用于返回
    logger = logging.getLogger(__name__)
    try:
        if data_source.config:
            data_source.config = json.loads(data_source.config)
        else:
            data_source.config = {}
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"解析数据源配置失败: {str(e)}, config: {data_source.config}")
        data_source.config = {}
    
    return data_source


@router.get("", response_model=List[DataSourceOut])
def list_data_sources(
    knowledge_base_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取知识库的数据源列表"""
    # 验证知识库是否存在且属于当前用户
    kb = (
        db.query(KnowledgeBase)
        .filter(
            KnowledgeBase.id == knowledge_base_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")
    
    data_sources = (
        db.query(DataSource)
        .filter(DataSource.knowledge_base_id == knowledge_base_id)
        .order_by(DataSource.created_at.desc())
        .all()
    )
    
    # 反序列化配置
    logger = logging.getLogger(__name__)
    for ds in data_sources:
        try:
            if ds.config:
                ds.config = json.loads(ds.config)
            else:
                ds.config = {}
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"解析数据源配置失败: {str(e)}, config: {ds.config}")
            ds.config = {}
    
    return data_sources


@router.get("/{data_source_id}", response_model=DataSourceOut)
def get_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取数据源详情"""
    logger = logging.getLogger(__name__)
    
    try:
        # 先查询数据源
        data_source = (
            db.query(DataSource)
            .filter(DataSource.id == data_source_id)
            .first()
        )
        
        if not data_source:
            raise HTTPException(status_code=404, detail="数据源不存在")
        
        # 验证知识库是否存在且属于当前用户
        kb = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.id == data_source.knowledge_base_id,
                KnowledgeBase.user_id == current_user.id,
            )
            .first()
        )
        
        if not kb:
            raise HTTPException(status_code=404, detail="数据源不存在或无权访问")
        
        # 反序列化配置
        try:
            if data_source.config:
                data_source.config = json.loads(data_source.config)
            else:
                data_source.config = {}
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"解析数据源配置失败: {str(e)}, config: {data_source.config}")
            # 如果配置无效，返回空字典
            data_source.config = {}
        
        return data_source
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取数据源失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取数据源失败: {str(e)}")


@router.put("/{data_source_id}", response_model=DataSourceOut)
def update_data_source(
    data_source_id: str,
    req: DataSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新数据源"""
    data_source = (
        db.query(DataSource)
        .join(KnowledgeBase)
        .filter(
            DataSource.id == data_source_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    if req.name is not None:
        data_source.name = req.name
    if req.config is not None:
        data_source.config = json.dumps(req.config, ensure_ascii=False)
    
    data_source.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(data_source)
    
    # 反序列化配置用于返回
    logger = logging.getLogger(__name__)
    try:
        if data_source.config:
            data_source.config = json.loads(data_source.config)
        else:
            data_source.config = {}
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"解析数据源配置失败: {str(e)}, config: {data_source.config}")
        data_source.config = {}
    
    return data_source


@router.delete("/{data_source_id}")
def delete_data_source(
    data_source_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除数据源"""
    data_source = (
        db.query(DataSource)
        .join(KnowledgeBase)
        .filter(
            DataSource.id == data_source_id,
            KnowledgeBase.user_id == current_user.id,
        )
        .first()
    )
    if not data_source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    
    db.delete(data_source)
    db.commit()
    return {"message": "数据源已删除"}


@router.post("/{data_source_id}/data", response_model=DataSourceDataResponse)
def get_data_source_data(
    data_source_id: str,
    req: DataSourceDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取数据源的数据（支持筛选和分页）"""
    logger = logging.getLogger(__name__)
    
    try:
        # 查询数据源
        data_source = (
            db.query(DataSource)
            .filter(DataSource.id == data_source_id)
            .first()
        )
        
        if not data_source:
            raise HTTPException(status_code=404, detail="数据源不存在")
        
        # 验证知识库是否存在且属于当前用户
        kb = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.id == data_source.knowledge_base_id,
                KnowledgeBase.user_id == current_user.id,
            )
            .first()
        )
        
        if not kb:
            raise HTTPException(status_code=403, detail="无权访问此数据源")
        
        # 解析配置
        try:
            if data_source.config:
                config = json.loads(data_source.config)
            else:
                config = {}
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"解析数据源配置失败: {str(e)}")
            config = {}
        
        # 获取表格数据
        all_data: List[dict] = []
        columns: List[str] = []
        
        if config.get("type") == "manual_table":
            # 手动创建的表格数据
            all_data = config.get("data", [])
            columns = config.get("columns", [])
            if not columns and all_data:
                columns = list(all_data[0].keys()) if all_data else []
        elif data_source.type == "excel" and config.get("filename"):
            # Excel 文件数据
            if config.get("data"):
                all_data = config.get("data", [])
                columns = config.get("columns", [])
                if not columns and all_data:
                    columns = list(all_data[0].keys()) if all_data else []
        elif data_source.type == "database":
            # 数据库数据（如果已查询）
            if config.get("data"):
                all_data = config.get("data", [])
                columns = config.get("columns", [])
                if not columns and all_data:
                    columns = list(all_data[0].keys()) if all_data else []
        
        # 应用筛选
        filtered_data = all_data
        if req.filters:
            filtered_data = []
            for row in all_data:
                match = True
                for column, filter_value in req.filters.items():
                    if not filter_value or not filter_value.strip():
                        continue
                    cell_value = str(row.get(column, "")).lower()
                    if filter_value.lower() not in cell_value:
                        match = False
                        break
                if match:
                    filtered_data.append(row)
        
        # 计算分页
        total = len(filtered_data)
        total_pages = math.ceil(total / req.page_size) if req.page_size > 0 else 1
        
        # 应用分页
        if req.page_size > 0:
            start_index = (req.page - 1) * req.page_size
            end_index = start_index + req.page_size
            paginated_data = filtered_data[start_index:end_index]
        else:
            paginated_data = filtered_data
        
        return DataSourceDataResponse(
            data=paginated_data,
            columns=columns,
            total=total,
            page=req.page,
            page_size=req.page_size,
            total_pages=total_pages,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取数据源数据失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取数据源数据失败: {str(e)}")

