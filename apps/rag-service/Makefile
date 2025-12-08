.PHONY: proto compile-proto grpc-server help

help:
	@echo "可用命令:"
	@echo "  make proto          - 编译 proto 文件生成 Python 代码"
	@echo "  make grpc-server    - 启动 gRPC 服务器"
	@echo "  make install        - 安装依赖"

proto:
	@echo "编译 proto 文件..."
	python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. proto/rag_service.proto
	@echo "完成！proto 文件已编译到 proto/ 目录"

compile-proto: proto

grpc-server:
	@echo "启动 gRPC 服务器..."
	python grpc_server.py

install:
	pip install -r requirements.txt

