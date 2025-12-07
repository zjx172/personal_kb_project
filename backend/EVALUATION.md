# RAG 评估系统使用指南

本系统集成了 **RAGAS** 和 **LangSmith** 两个评估框架，用于评估 RAG 系统的性能。

## 功能特性

### 1. RAGAS 评估

- **无需参考答案**：可以自动评估 RAG 系统
- **多维度指标**：
  - `faithfulness`（忠实度）：答案是否基于上下文
  - `answer_relevancy`（答案相关性）：答案是否回答问题
  - `context_precision`（上下文精确度）：检索到的上下文是否相关
  - `context_recall`（上下文召回率）：是否检索到所有相关信息（需要参考答案）

### 2. LangSmith 集成

- **自动追踪**：所有 RAG pipeline 的执行都会被自动追踪
- **可视化分析**：在 LangSmith 平台上查看详细的执行链路
- **性能监控**：监控 API 调用、延迟、成本等

## 安装和配置

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

在 `backend/.env` 文件中添加以下配置：

```env
# LangSmith 配置（可选，用于追踪和分析）
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=personal-kb-rag
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

**获取 LangSmith API Key：**

1. 访问 <https://smith.langchain.com/>
2. 注册/登录账号
3. 在设置中获取 API Key

### 3. 初始化数据库

运行迁移脚本创建评估相关的表：

```bash
python migrate_evaluation.py
```

## API 使用指南

### 1. 快速评估（不保存到数据库）

适用于快速测试和验证：

```bash
POST /evaluation/quick
Content-Type: application/json

{
  "questions": [
    "什么是 Python？",
    "如何安装 Python？"
  ],
  "ground_truths": [
    "Python 是一种编程语言",
    "从官网下载安装包"
  ],
  "knowledge_base_id": "optional-kb-id"
}
```

**响应示例：**

```json
{
  "success": true,
  "metrics_summary": {
    "faithfulness": {
      "mean": 0.85,
      "min": 0.7,
      "max": 1.0,
      "count": 2
    },
    "answer_relevancy": {
      "mean": 0.9,
      "min": 0.8,
      "max": 1.0,
      "count": 2
    }
  },
  "total_items": 2
}
```

### 2. 评估数据集管理

#### 创建数据集

```bash
POST /evaluation/datasets
{
  "knowledge_base_id": "kb-id",
  "name": "测试数据集",
  "description": "用于测试 RAG 系统"
}
```

#### 添加评估数据项

```bash
POST /evaluation/datasets/{dataset_id}/items
{
  "question": "什么是 Python？",
  "ground_truth": "Python 是一种编程语言",
  "context_doc_ids": ["doc-id-1", "doc-id-2"]
}
```

#### 获取数据集列表

```bash
GET /evaluation/datasets?knowledge_base_id=kb-id
```

### 3. 执行评估运行

#### 创建评估运行

```bash
POST /evaluation/runs
{
  "knowledge_base_id": "kb-id",
  "dataset_id": "dataset-id"
}
```

评估会在后台异步执行，返回运行 ID。

#### 查询运行状态

```bash
GET /evaluation/runs/{run_id}
```

**响应示例：**

```json
{
  "id": "run-id",
  "status": "completed",
  "metrics": {
    "faithfulness": {
      "mean": 0.85,
      "min": 0.7,
      "max": 1.0
    }
  },
  "total_items": 10,
  "completed_items": 10
}
```

#### 获取详细结果

```bash
GET /evaluation/runs/{run_id}/results
```

## 评估指标说明

### faithfulness（忠实度）

- **范围**：0-1
- **含义**：答案是否完全基于检索到的上下文，没有编造信息
- **目标**：> 0.8

### answer_relevancy（答案相关性）

- **范围**：0-1
- **含义**：答案是否回答了问题
- **目标**：> 0.8

### context_precision（上下文精确度）

- **范围**：0-1
- **含义**：检索到的上下文是否与问题相关
- **目标**：> 0.7

### context_recall（上下文召回率）

- **范围**：0-1
- **含义**：是否检索到了所有相关信息（需要参考答案）
- **目标**：> 0.7

## LangSmith 使用

### 查看追踪数据

1. 访问 <https://smith.langchain.com/>
2. 选择项目 `personal-kb-rag`（或你配置的项目名）
3. 查看：
   - **Traces**：每次查询的详细执行链路
   - **Sessions**：会话级别的聚合数据
   - **Evaluations**：评估结果（如果使用 LangSmith 评估）

### 分析内容

- **检索阶段**：查看检索到的文档和相关性分数
- **生成阶段**：查看 LLM 的输入输出
- **性能指标**：延迟、token 使用量、成本
- **错误追踪**：失败的请求和错误信息

## 最佳实践

### 1. 构建评估数据集

- **问题多样性**：涵盖不同类型的问题（事实性、解释性、操作指南等）
- **参考答案**：提供高质量的参考答案（可选，但能提升评估准确性）
- **相关文档**：标注每个问题应该检索到的相关文档 ID（用于计算召回率）

### 2. 定期评估

- **新文档添加后**：评估检索质量是否受影响
- **参数调整后**：评估 k、rerank_k 等参数的影响
- **Prompt 优化后**：评估生成质量的变化

### 3. 分析结果

- **低 faithfulness**：检查 prompt 是否要求过于严格，或检索质量不佳
- **低 answer_relevancy**：检查 prompt 是否清晰，或 LLM 理解有误
- **低 context_precision**：调整检索参数（k、rerank_k）或优化 embedding
- **低 context_recall**：增加检索数量（k）或优化文档分块策略

## 注意事项

1. **评估成本**：RAGAS 评估会调用 LLM，会产生 API 成本
2. **评估时间**：批量评估可能需要较长时间，建议使用后台任务
3. **数据隐私**：评估数据会发送到 RAGAS 和 LangSmith，注意数据隐私
4. **LangSmith 费用**：LangSmith 可能有使用限制和费用，请查看官方文档

## 故障排查

### RAGAS 评估失败

1. 检查 OpenAI API Key 是否正确配置
2. 检查网络连接
3. 查看日志中的详细错误信息

### LangSmith 追踪不工作

1. 检查 `LANGCHAIN_API_KEY` 是否正确
2. 检查 `LANGCHAIN_TRACING_V2` 是否为 `true`
3. 检查网络是否能访问 LangSmith API

### 评估结果异常

1. 检查评估数据是否正确
2. 检查 RAG pipeline 是否正常工作
3. 查看详细的评估结果，定位问题项

## 参考资源

- [RAGAS 文档](https://docs.ragas.io/)
- [LangSmith 文档](https://docs.smith.langchain.com/)
- [RAG 评估最佳实践](https://docs.ragas.io/concepts/metrics)
