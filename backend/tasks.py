"""
任务管理系统（异步优化版）
"""
import asyncio
from typing import Optional, Dict
from schemas import TaskInfo, TaskStatus


# 任务存储（使用内存字典，生产环境建议使用Redis）
tasks: Dict[str, TaskInfo] = {}
# 使用普通字典 + asyncio.Lock，避免线程锁阻塞
tasks_lock = asyncio.Lock()


async def update_task(
    task_id: str,
    status: TaskStatus,
    progress: int,
    message: str,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
):
    """更新任务状态（异步）"""
    async with tasks_lock:
        if task_id in tasks:
            tasks[task_id].status = status.value
            tasks[task_id].progress = progress
            tasks[task_id].message = message
            if result:
                tasks[task_id].result = result
            if error:
                tasks[task_id].error = error
        else:
            tasks[task_id] = TaskInfo(
                task_id=task_id,
                status=status.value,
                progress=progress,
                message=message,
                result=result,
                error=error,
            )


async def get_task(task_id: str) -> Optional[TaskInfo]:
    """获取任务状态（异步）"""
    # 使用异步锁保护读取操作，避免并发问题
    async with tasks_lock:
        task = tasks.get(task_id)
        # 如果任务存在，返回一个副本，避免外部修改
        if task:
            return TaskInfo(
                task_id=task.task_id,
                status=task.status,
                progress=task.progress,
                message=task.message,
                result=task.result,
                error=task.error,
            )
        return None

