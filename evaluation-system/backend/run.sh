#!/bin/bash

# 启动评估系统后端服务

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 初始化数据库
python init_db.py

# 启动服务
echo "启动评估系统后端服务..."
uvicorn app:app --host 0.0.0.0 --port 8001 --reload

