"""
评估相关路由
"""
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime

from db import get_db
from models import (
    EvaluationDataset,
    EvaluationDataItem,
    EvaluationRun,
    EvaluationResult,
)
from schemas import (
    EvaluationDatasetCreate,
    EvaluationDatasetUpdate,
    EvaluationDatasetOut,
    EvaluationDataItemCreate,
    EvaluationDataItemUpdate,
    EvaluationDataItemOut,
    EvaluationRunCreate,
    EvaluationRunOut,
    EvaluationResultOut,
    QuickEvaluationRequest,
    QuickEvaluationResponse,
)
from evaluation_service import evaluation_service

router = APIRouter(tags=["evaluation"])
logger = logging.getLogger(__name__)


# ========== 评估数据集管理 ==========

@router.post("/datasets", response_model=EvaluationDatasetOut)
def create_dataset(
    dataset: EvaluationDatasetCreate,
    db: Session = Depends(get_db),
):
    """创建评估数据集"""
    db_dataset = EvaluationDataset(
        knowledge_base_id=dataset.knowledge_base_id,
        name=dataset.name,
        description=dataset.description,
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    
    return db_dataset


@router.get("/datasets", response_model=List[EvaluationDatasetOut])
def list_datasets(
    knowledge_base_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取评估数据集列表"""
    query = db.query(EvaluationDataset)
    
    if knowledge_base_id:
        query = query.filter(EvaluationDataset.knowledge_base_id == knowledge_base_id)
    
    datasets = query.order_by(EvaluationDataset.created_at.desc()).all()
    return datasets


@router.get("/datasets/{dataset_id}", response_model=EvaluationDatasetOut)
def get_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
):
    """获取评估数据集详情"""
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return dataset


@router.put("/datasets/{dataset_id}", response_model=EvaluationDatasetOut)
def update_dataset(
    dataset_id: str,
    dataset_update: EvaluationDatasetUpdate,
    db: Session = Depends(get_db),
):
    """更新评估数据集"""
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    if dataset_update.name is not None:
        dataset.name = dataset_update.name
    if dataset_update.description is not None:
        dataset.description = dataset_update.description
    
    dataset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(dataset)
    
    return dataset


@router.delete("/datasets/{dataset_id}")
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db),
):
    """删除评估数据集"""
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    # 删除关联的数据项
    db.query(EvaluationDataItem).filter(
        EvaluationDataItem.dataset_id == dataset_id
    ).delete()
    
    db.delete(dataset)
    db.commit()
    
    return {"message": "数据集已删除"}


# ========== 评估数据项管理 ==========

@router.post("/datasets/{dataset_id}/items", response_model=EvaluationDataItemOut)
def create_data_item(
    dataset_id: str,
    item: EvaluationDataItemCreate,
    db: Session = Depends(get_db),
):
    """创建评估数据项"""
    # 验证数据集
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    # 创建数据项
    db_item = EvaluationDataItem(
        dataset_id=dataset_id,
        question=item.question,
        ground_truth=item.ground_truth,
        context_doc_ids=json.dumps(item.context_doc_ids) if item.context_doc_ids else None,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # 解析 context_doc_ids
    item_dict = {
        "id": db_item.id,
        "dataset_id": db_item.dataset_id,
        "question": db_item.question,
        "ground_truth": db_item.ground_truth,
        "context_doc_ids": json.loads(db_item.context_doc_ids) if db_item.context_doc_ids else None,
        "created_at": db_item.created_at,
    }
    
    return EvaluationDataItemOut(**item_dict)


@router.get("/datasets/{dataset_id}/items", response_model=List[EvaluationDataItemOut])
def list_data_items(
    dataset_id: str,
    db: Session = Depends(get_db),
):
    """获取评估数据项列表"""
    # 验证数据集
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    items = db.query(EvaluationDataItem).filter(
        EvaluationDataItem.dataset_id == dataset_id
    ).order_by(EvaluationDataItem.created_at.asc()).all()
    
    # 解析 context_doc_ids
    result = []
    for item in items:
        item_dict = {
            "id": item.id,
            "dataset_id": item.dataset_id,
            "question": item.question,
            "ground_truth": item.ground_truth,
            "context_doc_ids": json.loads(item.context_doc_ids) if item.context_doc_ids else None,
            "created_at": item.created_at,
        }
        result.append(EvaluationDataItemOut(**item_dict))
    
    return result


@router.put("/datasets/{dataset_id}/items/{item_id}", response_model=EvaluationDataItemOut)
def update_data_item(
    dataset_id: str,
    item_id: str,
    item_update: EvaluationDataItemUpdate,
    db: Session = Depends(get_db),
):
    """更新评估数据项"""
    # 验证数据集
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    # 获取数据项
    item = db.query(EvaluationDataItem).filter(
        EvaluationDataItem.id == item_id,
        EvaluationDataItem.dataset_id == dataset_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="数据项不存在")
    
    if item_update.question is not None:
        item.question = item_update.question
    if item_update.ground_truth is not None:
        item.ground_truth = item_update.ground_truth
    if item_update.context_doc_ids is not None:
        item.context_doc_ids = json.dumps(item_update.context_doc_ids) if item_update.context_doc_ids else None
    
    db.commit()
    db.refresh(item)
    
    # 解析 context_doc_ids
    item_dict = {
        "id": item.id,
        "dataset_id": item.dataset_id,
        "question": item.question,
        "ground_truth": item.ground_truth,
        "context_doc_ids": json.loads(item.context_doc_ids) if item.context_doc_ids else None,
        "created_at": item.created_at,
    }
    
    return EvaluationDataItemOut(**item_dict)


@router.delete("/datasets/{dataset_id}/items/{item_id}")
def delete_data_item(
    dataset_id: str,
    item_id: str,
    db: Session = Depends(get_db),
):
    """删除评估数据项"""
    # 验证数据集
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    item = db.query(EvaluationDataItem).filter(
        EvaluationDataItem.id == item_id,
        EvaluationDataItem.dataset_id == dataset_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="数据项不存在")
    
    db.delete(item)
    db.commit()
    
    return {"message": "数据项已删除"}


# ========== 评估执行 ==========

def run_evaluation_background(
    run_id: str,
    dataset_id: str,
    knowledge_base_id: str,
):
    """后台执行评估任务"""
    from db import SessionLocal
    db = SessionLocal()
    try:
        # 更新运行状态
        run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
        if not run:
            return
        
        run.status = "running"
        db.commit()
        
        # 获取数据项
        items = db.query(EvaluationDataItem).filter(
            EvaluationDataItem.dataset_id == dataset_id
        ).all()
        
        total_items = len(items)
        run.total_items = total_items
        db.commit()
        
        # 逐个评估
        completed = 0
        all_metrics = []
        
        for item in items:
            try:
                # 执行评估
                result = evaluation_service.evaluate_single_item(
                    question=item.question,
                    knowledge_base_id=knowledge_base_id,
                    ground_truth=item.ground_truth,
                )
                
                if result.get("success"):
                    # 保存评估结果
                    eval_result = EvaluationResult(
                        run_id=run_id,
                        data_item_id=item.id,
                        question=item.question,
                        answer=result.get("answer"),
                        context=json.dumps(result.get("contexts", [])),
                        metrics=json.dumps(result.get("metrics", {})),
                    )
                    db.add(eval_result)
                    
                    # 收集指标
                    if result.get("metrics"):
                        all_metrics.append(result["metrics"])
                
                completed += 1
                run.completed_items = completed
                db.commit()
            except Exception as e:
                logger.error(f"评估数据项失败: {str(e)}", exc_info=True)
                completed += 1
                run.completed_items = completed
                db.commit()
        
        # 计算平均指标
        if all_metrics:
            metrics_summary = {}
            metric_names = set()
            for metrics in all_metrics:
                metric_names.update(metrics.keys())
            
            for metric_name in metric_names:
                values = [m.get(metric_name) for m in all_metrics if m.get(metric_name) is not None]
                if values:
                    metrics_summary[metric_name] = {
                        "mean": sum(values) / len(values),
                        "min": min(values),
                        "max": max(values),
                        "count": len(values),
                    }
            
            run.metrics = json.dumps(metrics_summary)
        
        # 更新运行状态
        run.status = "completed"
        run.completed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        logger.error(f"评估运行失败: {str(e)}", exc_info=True)
        run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/runs", response_model=EvaluationRunOut)
def create_evaluation_run(
    run: EvaluationRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """创建并启动评估运行"""
    # 验证数据集
    dataset = db.query(EvaluationDataset).filter(
        EvaluationDataset.id == run.dataset_id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    
    # 创建运行记录
    db_run = EvaluationRun(
        knowledge_base_id=run.knowledge_base_id,
        dataset_id=run.dataset_id,
        status="pending",
    )
    db.add(db_run)
    db.commit()
    db.refresh(db_run)
    
    # 后台执行评估
    background_tasks.add_task(
        run_evaluation_background,
        run_id=db_run.id,
        dataset_id=run.dataset_id,
        knowledge_base_id=run.knowledge_base_id,
    )
    
    return db_run


@router.get("/runs", response_model=List[EvaluationRunOut])
def list_evaluation_runs(
    knowledge_base_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """获取评估运行列表"""
    query = db.query(EvaluationRun)
    
    if knowledge_base_id:
        query = query.filter(EvaluationRun.knowledge_base_id == knowledge_base_id)
    
    runs = query.order_by(EvaluationRun.created_at.desc()).all()
    
    # 解析 metrics
    result = []
    for run in runs:
        run_dict = {
            "id": run.id,
            "knowledge_base_id": run.knowledge_base_id,
            "dataset_id": run.dataset_id,
            "status": run.status,
            "metrics": json.loads(run.metrics) if run.metrics else None,
            "total_items": run.total_items,
            "completed_items": run.completed_items,
            "error_message": run.error_message,
            "created_at": run.created_at,
            "updated_at": run.updated_at,
            "completed_at": run.completed_at,
        }
        result.append(EvaluationRunOut(**run_dict))
    
    return result


@router.get("/runs/{run_id}", response_model=EvaluationRunOut)
def get_evaluation_run(
    run_id: str,
    db: Session = Depends(get_db),
):
    """获取评估运行详情"""
    run = db.query(EvaluationRun).filter(
        EvaluationRun.id == run_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="运行不存在")
    
    run_dict = {
        "id": run.id,
        "knowledge_base_id": run.knowledge_base_id,
        "dataset_id": run.dataset_id,
        "status": run.status,
        "metrics": json.loads(run.metrics) if run.metrics else None,
        "total_items": run.total_items,
        "completed_items": run.completed_items,
        "error_message": run.error_message,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
        "completed_at": run.completed_at,
    }
    
    return EvaluationRunOut(**run_dict)


@router.get("/runs/{run_id}/results", response_model=List[EvaluationResultOut])
def get_evaluation_results(
    run_id: str,
    db: Session = Depends(get_db),
):
    """获取评估结果列表"""
    # 验证运行
    run = db.query(EvaluationRun).filter(
        EvaluationRun.id == run_id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="运行不存在")
    
    results = db.query(EvaluationResult).filter(
        EvaluationResult.run_id == run_id
    ).order_by(EvaluationResult.created_at.asc()).all()
    
    # 解析 context 和 metrics
    result_list = []
    for result in results:
        result_dict = {
            "id": result.id,
            "run_id": result.run_id,
            "data_item_id": result.data_item_id,
            "question": result.question,
            "answer": result.answer,
            "context": json.loads(result.context) if result.context else None,
            "metrics": json.loads(result.metrics) if result.metrics else None,
            "created_at": result.created_at,
        }
        result_list.append(EvaluationResultOut(**result_dict))
    
    return result_list


# ========== 快速评估（不保存到数据库） ==========

@router.post("/quick", response_model=QuickEvaluationResponse)
def quick_evaluate(
    request: QuickEvaluationRequest,
    db: Session = Depends(get_db),
):
    """快速评估（不保存到数据库，直接返回结果）"""
    # 执行评估
    result = evaluation_service.evaluate_with_ragas(
        questions=request.questions,
        knowledge_base_id=request.knowledge_base_id,
        ground_truths=request.ground_truths,
    )
    
    return QuickEvaluationResponse(**result)

