#!/bin/bash

set -e

# 定位到仓库根目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_DIR="$PROJECT_ROOT/apps/eval-api"
FRONTEND_DIR="$PROJECT_ROOT/apps/eval-web"

echo "启动 RAG 评估系统..."

# 启动后端
echo "启动后端服务..."
cd "$BACKEND_DIR"
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
python init_db.py
uvicorn app:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo "后端服务运行在: http://localhost:8001"
echo "前端服务运行在: http://localhost:5174"
echo "API 文档: http://localhost:8001/docs"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait

