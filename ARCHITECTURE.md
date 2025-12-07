# 架构设计文档

## 概述

本项目采用**混合架构**，将 FastAPI 后端和 RAG 流程分离，支持两种调用方式：

1. **Python 包模式**（默认）：直接导入，高性能，适合单机部署
2. **gRPC 模式**（可选）：独立部署，可扩展，适合微服务架构

## 架构图

### Python 包模式（默认）

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   Backend API   │  ───┐
│   (FastAPI)     │     │ Python 导入
└────────┬────────┘     │
         │              │
         │              ▼
         │      ┌─────────────────┐
         │      │   RAG Service    │
         │      │   (Python 包)    │
         │      └─────────────────┘
         │              │
         │              ▼
         │      ┌─────────────────┐
         │      │  Vector Store    │
         │      │  (ChromaDB)     │
         │      └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│   (SQLite)      │
└─────────────────┘
```

### gRPC 模式（可选）

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐      gRPC      ┌─────────────────┐
│   Backend API   │ ──────────────> │   RAG Service   │
│   (FastAPI)     │                 │   (gRPC Server) │
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         │                                   ▼
         │                          ┌─────────────────┐
         │                          │  Vector Store    │
         │                          │  (ChromaDB)     │
         │                          └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│   (SQLite)      │
└─────────────────┘
```

## 目录结构

```
personal_kb_project/
├── backend/              # FastAPI 后端服务
│   ├── routers/         # API 路由
│   ├── services/        # 业务服务层
│   │   ├── rag_adapter.py  # RAG 服务适配器（支持两种模式）
│   │   └── vector_store.py
│   ├── models.py        # 数据模型
│   ├── db.py            # 数据库连接
│   └── app.py           # FastAPI 应用入口
│
├── rag-service/         # RAG 服务包（独立模块）
│   ├── __init__.py      # 包入口
│   ├── config.py        # 配置
│   ├── retrieval.py     # 向量检索
│   ├── rag_pipeline.py  # RAG Pipeline
│   ├── services.py      # 服务初始化
│   ├── grpc_server.py   # gRPC 服务器（可选）
│   └── proto/           # gRPC proto 定义
│       └── rag_service.proto
│
├── frontend/            # React 前端
└── chrome-extension/     # Chrome 扩展
```

## 核心组件

### 1. Backend API (FastAPI)

**职责：**

- HTTP API 接口
- 用户认证和授权
- 业务逻辑处理
- 数据库操作
- 会话管理

**特点：**

- 不直接处理 RAG 逻辑
- 通过适配器调用 RAG 服务（支持两种模式）
- 专注于业务逻辑和 API 层

### 2. RAG Service

**职责：**

- 向量检索
- RAG Pipeline 执行
- LLM 调用
- 文档检索和生成

**两种模式：**

#### Python 包模式（默认）

- 独立的 Python 包
- 通过直接导入使用（无 HTTP 开销）
- 保持代码分离和模块化
- 易于测试和维护

#### gRPC 模式（可选）

- 独立的 gRPC 服务
- 支持独立部署和扩展
- 支持跨语言调用
- 适合微服务架构

### 3. 适配器模式

通过 `rag_adapter.py` 统一接口，支持两种调用方式：

```python
# 根据环境变量自动选择
if USE_GRPC:
    rag_service = GRPCRAGService()  # gRPC 模式
else:
    rag_service = LocalRAGService()  # Python 包模式
```

## 两种模式对比

| 特性           | Python 包 | gRPC       |
| -------------- | --------- | ---------- |
| **延迟**       | <1ms      | 1-5ms      |
| **吞吐量**     | 最高      | 高         |
| **独立部署**   | ❌        | ✅         |
| **跨语言**     | ❌        | ✅         |
| **流式传输**   | ✅ 原生   | ✅ 双向流  |
| **开发复杂度** | 低        | 中         |
| **适用场景**   | 单机部署  | 微服务架构 |

## 配置和使用

### Python 包模式（默认）

```bash
# .env 或环境变量
USE_GRPC_RAG_SERVICE=false
```

```python
# backend 中直接使用
from services.vector_store import rag_pipeline
result = rag_pipeline.query(question="...")
```

### gRPC 模式

```bash
# .env 或环境变量
USE_GRPC_RAG_SERVICE=true
GRPC_RAG_SERVICE_URL=localhost:50051
```

```bash
# 1. 编译 proto 文件
cd rag-service
make proto

# 2. 启动 gRPC 服务器
python grpc_server.py

# 3. Backend 自动使用 gRPC 模式
```

## 数据流

### Python 包模式

```
1. 前端发送查询请求
   ↓
2. Backend API 接收请求
   ↓
3. Backend 验证用户权限
   ↓
4. Backend 直接调用 rag_pipeline.query()（Python 调用）
   ↓
5. RAG Service 执行向量检索
   ↓
6. RAG Service 调用 LLM 生成回答
   ↓
7. Backend 保存结果到数据库
   ↓
8. Backend 返回结果给前端
```

### gRPC 模式

```
1. 前端发送查询请求
   ↓
2. Backend API 接收请求
   ↓
3. Backend 验证用户权限
   ↓
4. Backend 通过 gRPC 调用 RAG 服务
   ↓
5. RAG Service（独立进程）执行向量检索
   ↓
6. RAG Service 调用 LLM 生成回答
   ↓
7. RAG Service 通过 gRPC 返回结果
   ↓
8. Backend 保存结果到数据库
   ↓
9. Backend 返回结果给前端
```

## 配置管理

### Backend 配置 (`backend/config.py`)

- 数据库配置
- JWT 配置
- OAuth 配置
- RAG 服务模式配置

### RAG Service 配置 (`rag-service/config.py`)

- OpenAI API 配置
- 向量库配置
- LangSmith 配置
- gRPC 服务器配置

## 部署方案

### 开发环境

- **Python 包模式**：单进程运行，所有服务在同一进程
- `uvicorn backend.app:app` 启动

### 生产环境 - Python 包模式

- 单进程部署（推荐用于小-中规模）
- `uvicorn backend.app:app --port 8000`

### 生产环境 - gRPC 模式

- 分离部署（推荐用于大规模）
- Backend API: `uvicorn backend.app:app --port 8000`
- RAG Service: `python rag-service/grpc_server.py --port 50051`

## 优势总结

1. **灵活选择**：根据需求选择 Python 包或 gRPC
2. **代码分离**：RAG 逻辑独立，易于维护
3. **高性能**：Python 包模式零延迟
4. **可扩展**：gRPC 模式支持独立部署和扩展
5. **易于迁移**：可以渐进式从 Python 包迁移到 gRPC

## 决策建议

### 使用 Python 包模式，如果

- ✅ 当前是单机部署
- ✅ 团队主要是 Python
- ✅ 性能要求高（低延迟）
- ✅ 不需要独立扩展 RAG 服务

### 使用 gRPC 模式，如果

- ✅ 需要独立部署和扩展
- ✅ 需要跨语言调用
- ✅ 预期大规模并发
- ✅ 需要服务治理（负载均衡、监控等）

## 参考文档

- [架构决策文档](./ARCHITECTURE_DECISION.md) - 详细的架构决策说明
- [RAG Service README](./rag-service/README.md) - RAG 服务使用说明
