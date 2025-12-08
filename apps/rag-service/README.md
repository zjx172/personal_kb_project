# RAG Service Package

独立的 RAG（检索增强生成）服务包，支持两种使用方式：

1. **Python 包**：直接导入使用（默认，高性能）
2. **gRPC 服务**：独立部署，支持跨语言调用（可扩展）

## 架构设计

- **职责分离**：RAG 服务专注于检索和生成，不处理业务逻辑
- **代码解耦**：通过 Python 包的方式组织代码，保持模块化
- **灵活部署**：支持本地调用和独立部署两种方式
- **易于扩展**：通过 gRPC 支持微服务架构

## 使用方式

### 方式 1：Python 包（默认，推荐用于单机部署）

```python
from rag_service import rag_pipeline, retrieval_service

# 使用 RAG pipeline
result = rag_pipeline.query(
    question="什么是 Python？",
    k=10,
    rerank_k=5,
)

# 流式查询
for chunk in rag_pipeline.stream_query(question="什么是 Python？"):
    print(chunk)
```

### 方式 2：gRPC 服务（推荐用于微服务架构）

#### 1. 编译 proto 文件

```bash
cd rag-service
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. proto/rag_service.proto
```

#### 2. 启动 gRPC 服务器

```bash
python grpc_server.py
# 或
python -m rag_service.grpc_server
```

#### 3. 在 backend 中使用

```python
# 设置环境变量
export USE_GRPC_RAG_SERVICE=true
export GRPC_RAG_SERVICE_URL=localhost:50051

# 使用适配器
from backend.services.rag_adapter import rag_service

result = rag_service.query(question="什么是 Python？")
```

## 项目结构

```text
rag-service/
├── __init__.py          # 包入口
├── config.py            # 配置
├── retrieval.py         # 向量检索服务
├── rag_pipeline.py      # RAG Pipeline
├── services.py          # 服务初始化
├── grpc_server.py       # gRPC 服务器
├── proto/               # gRPC proto 定义
│   └── rag_service.proto
└── requirements.txt     # 依赖
```

## 配置

在 `backend/.env` 或环境变量中配置：

### Python 包模式（默认）

```bash
USE_GRPC_RAG_SERVICE=false
```

### gRPC 模式

```bash
USE_GRPC_RAG_SERVICE=true
GRPC_RAG_SERVICE_URL=localhost:50051
```

其他配置：

- `OPENAI_API_KEY`: OpenAI API Key
- `OPENAI_BASE_URL`: OpenAI API Base URL
- `VECTOR_STORE_DIR`: 向量库存储目录（默认使用 backend/vector_store）
- `COLLECTION_NAME`: 向量库集合名称

## 两种方式对比

| 特性           | Python 包 | gRPC       |
| -------------- | --------- | ---------- |
| **延迟**       | <1ms      | 1-5ms      |
| **吞吐量**     | 最高      | 高         |
| **独立部署**   | ❌        | ✅         |
| **跨语言**     | ❌        | ✅         |
| **流式传输**   | ✅ 原生   | ✅ 双向流  |
| **开发复杂度** | 低        | 中         |
| **适用场景**   | 单机部署  | 微服务架构 |

## 推荐使用场景

### 使用 Python 包，如果

- ✅ 单机部署
- ✅ 团队主要是 Python
- ✅ 性能要求高（低延迟）
- ✅ 不需要独立扩展 RAG 服务

### 使用 gRPC，如果

- ✅ 需要独立部署和扩展
- ✅ 需要跨语言调用
- ✅ 预期大规模并发
- ✅ 需要服务治理（负载均衡、监控等）

## 优势

1. **零网络延迟**（Python 包模式）：直接 Python 调用，无 HTTP 开销
2. **流式传输高效**：直接生成器，无需序列化
3. **代码分离**：保持模块化，易于维护
4. **易于测试**：可以直接导入测试
5. **灵活扩展**：可以轻松切换到 gRPC 模式

## 未来扩展

如果未来需要独立部署为微服务，可以：

1. 使用 gRPC 模式（已实现）
2. 添加服务发现和负载均衡
3. 添加监控和追踪
4. 支持多语言客户端
