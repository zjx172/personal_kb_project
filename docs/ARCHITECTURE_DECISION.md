# 架构决策：服务包 vs RPC

## 大厂实践总结

根据调研，大厂在类似场景下的选择：

### Google / OpenAI 等大厂实践

- **内部服务**：优先使用 gRPC 进行服务间通信
- **原因**：支持独立部署、跨语言、高并发、可扩展
- **适用场景**：微服务架构、大规模分布式系统

### 中小型项目实践

- **初期**：Python 包直接导入（性能好、简单）
- **扩展期**：逐步迁移到 gRPC（需要独立扩展时）

## 推荐方案：混合架构

### 阶段 1：当前（Python 包）

- **使用方式**：直接 Python 导入
- **优势**：零延迟、简单、易调试
- **适用**：单机部署、小规模

### 阶段 2：扩展（gRPC 接口）

- **使用方式**：通过 gRPC 调用
- **优势**：独立部署、跨语言、可扩展
- **适用**：多实例部署、大规模

## 实现策略

### 方案 A：适配器模式（推荐）

```python
# 统一的 RAG 服务接口
class RAGServiceInterface:
    def query(self, question: str, ...) -> Dict:
        raise NotImplementedError

    def stream_query(self, question: str, ...) -> Iterator:
        raise NotImplementedError

# Python 包实现
class LocalRAGService(RAGServiceInterface):
    def __init__(self):
        from rag_service import rag_pipeline
        self.pipeline = rag_pipeline

    def query(self, question: str, ...):
        return self.pipeline.query(question, ...)

# gRPC 实现
class GRPCRAGService(RAGServiceInterface):
    def __init__(self, grpc_channel):
        self.stub = rag_service_pb2_grpc.RAGServiceStub(grpc_channel)

    def query(self, question: str, ...):
        request = rag_service_pb2.QueryRequest(question=question, ...)
        response = self.stub.Query(request)
        return {"answer": response.answer, "citations": ...}

# 根据配置选择
if USE_GRPC:
    rag_service = GRPCRAGService(grpc_channel)
else:
    rag_service = LocalRAGService()
```

### 方案 B：渐进式迁移

1. **当前**：使用 Python 包
2. **添加 gRPC 层**：保留 Python 包，同时提供 gRPC 接口
3. **逐步迁移**：根据需求逐步切换到 gRPC

## 技术选型对比

| 特性           | Python 包    | gRPC        | HTTP REST      |
| -------------- | ------------ | ----------- | -------------- |
| **延迟**       | 最低（<1ms） | 低（1-5ms） | 中等（5-20ms） |
| **吞吐量**     | 最高         | 高          | 中等           |
| **独立部署**   | ❌           | ✅          | ✅             |
| **跨语言**     | ❌           | ✅          | ✅             |
| **流式传输**   | ✅ 原生      | ✅ 双向流   | ⚠️ SSE         |
| **开发复杂度** | 低           | 中          | 低             |
| **可扩展性**   | 低           | 高          | 中             |
| **适用规模**   | 小-中        | 中-大       | 中             |

## 决策建议

### 选择 Python 包，如果

- ✅ 当前是单机部署
- ✅ 团队主要是 Python
- ✅ 性能要求高（低延迟）
- ✅ 不需要独立扩展 RAG 服务

### 选择 gRPC，如果

- ✅ 需要独立部署和扩展
- ✅ 需要跨语言调用
- ✅ 预期大规模并发
- ✅ 需要服务治理（负载均衡、监控等）

### 推荐：混合方案

- **当前**：使用 Python 包（简单高效）
- **同时**：实现 gRPC 接口（为未来准备）
- **配置切换**：通过环境变量选择使用方式

## 实施计划

### Phase 1: 当前架构（已完成）

- ✅ RAG 服务作为 Python 包
- ✅ Backend 直接导入使用

### Phase 2: 添加 gRPC 接口（可选）

- [ ] 定义 gRPC proto 文件
- [ ] 实现 gRPC 服务端
- [ ] 实现 gRPC 客户端适配器
- [ ] 添加配置开关

### Phase 3: 渐进式迁移（按需）

- [ ] 监控和评估性能
- [ ] 根据需求决定是否切换

## 结论

**当前推荐：Python 包 + 预留 gRPC 接口**

这样既满足当前需求（简单高效），又为未来扩展做好准备（可独立部署）。
