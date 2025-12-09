import json


def sse_event(payload: dict) -> str:
    """格式化 SSE payload."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def chunk_event(text: str) -> str:
    return sse_event({"type": "chunk", "chunk": text})

