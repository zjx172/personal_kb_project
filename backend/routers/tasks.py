"""
任务管理路由
"""
from fastapi import APIRouter, HTTPException
from schemas import TaskInfo
from tasks import get_task

router = APIRouter(prefix="/task", tags=["tasks"])


@router.get("/{task_id}", response_model=TaskInfo)
def get_task_status(task_id: str):
    """获取任务状态"""
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task

