#!/usr/bin/env python3
"""
应用启动脚本
确保在导入应用之前加载 eval_type_backport
"""
# 必须在所有导入之前
try:
    import eval_type_backport  # noqa: F401
except ImportError:
    pass

# 现在可以安全导入应用
from app import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)

