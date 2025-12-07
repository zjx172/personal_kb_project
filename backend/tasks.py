"""
任务管理系统
"""
from typing import Optional, Dict
from threading import Lock
from schemas import TaskInfo, TaskStatus


# 任务存储（使用内存字典，生产环境建议使用Redis）
tasks: Dict[str, TaskInfo] = {}
tasks_lock = Lock()


def update_task(
    task_id: str,
    status: TaskStatus,
    progress: int,
    message: str,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
):
    """更新任务状态"""
    with tasks_lock:
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


def get_task(task_id: str) -> Optional[TaskInfo]:
    """获取任务状态"""
    with tasks_lock:
        return tasks.get(task_id)

