# Personal Knowledge Base Project

一个基于 RAG (Retrieval-Augmented Generation) 的个人知识库系统，支持文档管理、向量检索和智能问答。

## 主要功能

### 1. 向量检索层

- 使用 Chroma 存储文档向量
- 支持按主题标签（topic）和文档类型（doc_type）过滤
- 集成 rerank 模型提升长尾技术问题的命中率

### 2. RAG Pipeline

- 基于 LangChain Runnable 构建的 RAG pipeline
- 检索文档重组为结构化上下文
- 优化的 prompt 模板，回答包含引用标注（[1], [2] 等）
- 支持流式返回

### 3. 文档管理

- 在线编辑 Markdown 文档（飞书风格）
- 支持主题标签和文档类型分类
- 网页内容提取并转换为 Markdown
- 文档自动同步到向量库

### 4. 前端功能

- 对话式检索界面
- 答案中的引用标号可点击，跳转到对应文档
- 支持按引用高亮对应原文段落
- 文档列表和编辑界面

## 技术栈

### 后端

- FastAPI
- SQLAlchemy (SQLite)
- LangChain
- Chroma (向量数据库)
- OpenAI API (Embeddings & LLM)

### 前端

- React + TypeScript
- Vite
- Arco Design
- Vditor (Markdown 编辑器)

## 安装和运行

### 后端

```bash
cd backend
pip3 install -r requirements.txt
python3 init_db.py
python3 ingest.py  # 可选：导入 docs/ 目录下的文档
python3 -m uvicorn app:app --reload --port 8000
```

### 前端

```bash
cd frontend
pnpm install
pnpm run dev
```

## 使用说明

1. **创建文档**：在左侧边栏点击"新建文档"或使用"提取网页内容"功能
2. **编辑文档**：点击文档列表中的文档进行编辑，支持设置主题标签和文档类型
3. **搜索知识库**：在主界面输入问题，系统会从知识库中检索相关文档并生成答案
4. **查看引用**：答案中的引用标号（如 [1], [2]）可点击，会跳转到对应文档并高亮相关段落

## 项目结构

```
backend/
  ├── app.py              # FastAPI 主应用
  ├── models.py           # 数据模型
  ├── db.py               # 数据库配置
  ├── config.py           # 配置文件
  ├── retrieval.py        # 向量检索服务层
  ├── rag_pipeline.py     # RAG Pipeline
  └── ingest.py           # 文档导入脚本

frontend/
  ├── src/
  │   ├── pages/          # 页面组件
  │   ├── components/     # 通用组件
  │   └── api.ts          # API 接口
  └── ...
```

## 配置

在 `backend/config.py` 中配置：

- `OPENAI_API_KEY`: OpenAI API Key
- `OPENAI_BASE_URL`: API 基础 URL
- `DOCS_DIR`: 文档目录
- `VECTOR_STORE_DIR`: 向量库存储目录
