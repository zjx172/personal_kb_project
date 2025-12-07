# 快速开始指南

## 前置要求

- Python 3.9+
- Node.js 18+
- 主 RAG 系统正在运行（默认 http://localhost:8000）

## 快速启动

### 方式一：使用启动脚本（推荐）

```bash
cd evaluation-system
./start.sh
```

### 方式二：手动启动

#### 1. 启动后端

```bash
cd evaluation-system/backend

# 创建虚拟环境（首次运行）
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，至少设置 OPENAI_API_KEY 和 RAG_SERVICE_URL

# 初始化数据库
python init_db.py

# 启动服务
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

#### 2. 启动前端

```bash
cd evaluation-system/frontend

# 安装依赖（首次运行）
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 VITE_API_BASE_URL=http://localhost:8001

# 启动开发服务器
npm run dev
```

## 访问系统

- **前端界面**: http://localhost:5174
- **后端 API**: http://localhost:8001
- **API 文档**: http://localhost:8001/docs

## 首次使用

1. **创建评估数据集**
   - 访问前端界面
   - 进入"数据集"页面
   - 点击"创建数据集"
   - 填写知识库 ID 和数据集名称

2. **添加评估问题**
   - 在数据集详情页面
   - 点击"添加数据项"
   - 输入问题和可选的参考答案

3. **运行评估**
   - 在数据集详情页面
   - 点击"运行评估"
   - 在"评估运行"页面查看进度

4. **查看结果**
   - 点击运行记录查看详细结果
   - 查看指标趋势图和每个问题的评估结果

## 配置说明

### 必需配置

- `OPENAI_API_KEY`: OpenAI API Key（用于 RAGAS 评估）
- `RAG_SERVICE_URL`: 主 RAG 系统的 URL（默认 http://localhost:8000）

### 可选配置

- `LANGCHAIN_API_KEY`: LangSmith API Key（用于追踪）
- `LANGCHAIN_TRACING_V2`: 是否启用 LangSmith 追踪（true/false）
- `OPENAI_BASE_URL`: OpenAI API 基础 URL（如果使用代理）

## 常见问题

### 1. 后端启动失败

- 检查 Python 版本（需要 3.9+）
- 检查依赖是否安装完整
- 查看错误日志

### 2. 前端无法连接后端

- 检查后端是否运行
- 检查 `VITE_API_BASE_URL` 配置
- 检查 CORS 配置

### 3. 评估失败

- 检查 OpenAI API Key 是否正确
- 检查 RAG 服务是否可访问
- 查看后端日志

### 4. 数据库错误

- 删除 `backend/evaluation.db` 文件
- 重新运行 `python init_db.py`

## 下一步

- 阅读 [README.md](./README.md) 了解详细功能
- 查看 [API 文档](http://localhost:8001/docs) 了解 API 接口
- 参考评估指标说明优化 RAG 系统

