"""
任务管理系统（异步版），支持可选 Redis 存储，默认内存字典。
"""
import asyncio
import json
import logging
from typing import Optional, Dict

from config import REDIS_URL, TASK_STATUS_TTL_SECONDS
from schemas import TaskInfo, TaskStatus

logger = logging.getLogger(__name__)

# --------------------
# Redis 客户端（可选）
# --------------------
try:
    from redis.asyncio import Redis  # type: ignore
except Exception:  # pragma: no cover - 依赖缺失时回退
    Redis = None

redis_client: Optional["Redis"] = None
if REDIS_URL and Redis:
    try:
        redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
        logger.info("任务状态将存入 Redis")
    except Exception as e:
        logger.warning(f"初始化 Redis 失败，改用内存存储: {e}")
        redis_client = None

# --------------------
# 内存存储回退
# --------------------
tasks: Dict[str, TaskInfo] = {}
tasks_lock = asyncio.Lock()

TASK_KEY_PREFIX = "tasks:"


def _task_key(task_id: str) -> str:
    return f"{TASK_KEY_PREFIX}{task_id}"


async def _save_task_memory(
    task_id: str,
    status: TaskStatus,
    progress: int,
    message: str,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
) -> None:
    async with tasks_lock:
        tasks[task_id] = TaskInfo(
            task_id=task_id,
            status=status.value,
            progress=progress,
            message=message,
            result=result,
            error=error,
        )


async def _load_task_memory(task_id: str) -> Optional[TaskInfo]:
    async with tasks_lock:
        task = tasks.get(task_id)
        return TaskInfo(**task.model_dump()) if task else None


async def update_task(
    task_id: str,
    status: TaskStatus,
    progress: int,
    message: str,
    result: Optional[Dict] = None,
    error: Optional[str] = None,
) -> None:
    """更新任务状态（异步）。优先写 Redis，失败则回退内存。"""
    if redis_client:
        payload = TaskInfo(
            task_id=task_id,
            status=status.value,
            progress=progress,
            message=message,
            result=result,
            error=error,
        ).model_dump()
        try:
            await redis_client.set(
                _task_key(task_id),
                json.dumps(payload, ensure_ascii=False),
                ex=TASK_STATUS_TTL_SECONDS,
            )
            return
        except Exception as e:
            logger.warning(f"写入 Redis 任务状态失败，回退内存: {e}")
    await _save_task_memory(task_id, status, progress, message, result, error)


async def get_task(task_id: str) -> Optional[TaskInfo]:
    """获取任务状态（异步）。优先读 Redis，失败则回退内存。"""
    if redis_client:
        try:
            data = await redis_client.get(_task_key(task_id))
            if data:
                return TaskInfo(**json.loads(data))
        except Exception as e:
            logger.warning(f"读取 Redis 任务状态失败，回退内存: {e}")
    return await _load_task_memory(task_id)

