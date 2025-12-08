"""
任务管理路由
"""
import logging
from fastapi import APIRouter, HTTPException
from schemas import TaskInfo
from tasks import get_task

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/task", tags=["tasks"])


@router.get("/{task_id}", response_model=TaskInfo)
async def get_task_status(task_id: str):
    """获取任务状态（异步，快速响应）"""
    try:
        # 快速返回，不阻塞
        task = await get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="任务不存在")
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取任务状态失败: {str(e)}")

