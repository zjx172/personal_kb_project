# RAG 评估跟踪系统

基于 RAGAS 和 LangSmith 的独立 RAG 评估跟踪系统，用于评估和监控 RAG 系统的性能。

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

### 3. 评估数据集管理
- 创建和管理评估数据集
- 添加评估问题（支持参考答案和相关文档标注）
- 批量评估支持

### 4. 评估运行跟踪
- 异步执行评估任务
- 实时查看评估进度
- 详细的评估结果展示
- 指标可视化（图表）

## 系统架构

```
evaluation-system/
├── backend/          # FastAPI 后端
│   ├── app.py        # 应用主文件
│   ├── config.py     # 配置
│   ├── db.py         # 数据库配置
│   ├── models.py     # 数据模型
│   ├── schemas.py    # API 模型
│   ├── evaluation_service.py  # 评估服务
│   ├── rag_client.py # RAG 服务客户端
│   └── routers/      # API 路由
└── frontend/         # React 前端
    ├── src/
    │   ├── pages/    # 页面组件
    │   ├── components/  # UI 组件
    │   └── api.ts    # API 客户端
    └── package.json
```

## 安装和配置

### 1. 后端设置

```bash
cd evaluation-system/backend

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 初始化数据库
python init_db.py

# 启动服务
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### 2. 前端设置

```bash
cd evaluation-system/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 3. 环境变量配置

在 `backend/.env` 文件中配置：

```env
# OpenAI 配置（用于 RAGAS 评估）
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# LangSmith 配置（可选，用于追踪和分析）
LANGCHAIN_API_KEY=your-langsmith-api-key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=rag-evaluation
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com

# RAG 服务配置（连接到主系统的 RAG 服务）
RAG_SERVICE_URL=http://localhost:8000
RAG_SERVICE_API_KEY=optional-api-key

# CORS 配置
CORS_ORIGINS=http://localhost:5174,http://localhost:3000
```

在 `frontend/.env` 文件中配置：

```env
VITE_API_BASE_URL=http://localhost:8001
```

## 使用指南

### 1. 创建评估数据集

1. 访问前端界面，进入"数据集"页面
2. 点击"创建数据集"
3. 填写数据集名称、描述和知识库 ID
4. 添加评估问题（可选的参考答案和相关文档 ID）

### 2. 运行评估

1. 在数据集详情页面，点击"运行评估"
2. 系统会在后台异步执行评估
3. 在"评估运行"页面查看进度和结果

### 3. 快速评估

1. 进入"快速评估"页面
2. 输入问题和可选的参考答案
3. 点击"开始评估"立即获得结果（不保存到数据库）

### 4. 查看结果

1. 在"评估运行"页面查看所有运行记录
2. 点击运行记录查看详细结果
3. 查看指标趋势图和每个问题的详细评估结果

## API 文档

启动后端服务后，访问：
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

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

1. 访问 https://smith.langchain.com/
2. 选择项目 `rag-evaluation`（或你配置的项目名）
3. 查看：
   - **Traces**：每次查询的详细执行链路
   - **Sessions**：会话级别的聚合数据
   - **Evaluations**：评估结果

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

### RAG 服务连接失败

1. 检查 `RAG_SERVICE_URL` 是否正确
2. 检查主系统的 RAG 服务是否运行
3. 检查 API Key（如果配置了）

## 参考资源

- [RAGAS 文档](https://docs.ragas.io/)
- [LangSmith 文档](https://docs.smith.langchain.com/)
- [RAG 评估最佳实践](https://docs.ragas.io/concepts/metrics)

