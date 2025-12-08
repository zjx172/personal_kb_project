# WisdomVault — 智慧宝库

一个基于 RAG (Retrieval-Augmented Generation) 的智能知识库系统，支持文档管理、向量检索和智能问答，集成 Google OAuth 登录认证。

## ✨ 最新功能

- 🆕 **多格式文件上传**：支持 PDF、Word、PowerPoint、Markdown 等多种格式
- 🆕 **知识库类型**：支持文档型知识库和表格型知识库（连接数据库/Excel）
- 🆕 **智能文件解析**：自动提取各种格式文件的文本内容
- 🆕 **默认知识库保护**：系统默认知识库无法删除，确保数据安全

## 主要功能

### 1. 用户认证

- Google OAuth 2.0 登录
- JWT Token 认证
- 用户数据隔离（每个用户只能访问自己的文档）

### 2. 向量检索层

- 使用 Chroma 存储文档向量
- 支持按主题标签（tags）和文档类型（doc_type）过滤
- 支持日期范围过滤
- 集成 rerank 模型提升长尾技术问题的命中率
- 支持混合搜索（向量搜索 + 关键词搜索）

### 3. RAG Pipeline

- 基于 LangChain Runnable 构建的 RAG pipeline
- 检索文档重组为结构化上下文
- 优化的 prompt 模板，回答包含引用标注（[1], [2] 等）
- 支持流式返回
- 支持严格模式（相关性低于阈值时拒绝回答）

### 4. 多知识库管理

- 支持创建多个知识库
- 每个知识库独立的文档集合
- 知识库级别的权限管理
- **知识库类型**：
  - **文档型知识库**（默认）：用于存储和管理文档
  - **表格型知识库**：支持连接数据库或 Excel 表格进行数据分析
- **默认知识库保护**：系统自动创建的默认知识库无法删除，确保数据安全

### 5. 文档管理

- Markdown 文档在线编辑
- **多格式文件上传**：
  - PDF 文件上传和解析
  - Word 文档（DOCX）上传和解析
  - PowerPoint 演示文稿（PPT/PPTX）上传和解析
  - Markdown 文件上传
- 网页内容提取
- 文档标签和摘要自动生成
- 文档高亮和标注
- **大文件支持**：自动分片上传（>10MB），提升上传成功率

### 6. 对话管理

- 多轮对话支持
- 对话历史保存
- 引用来源追踪

### 7. 文件存储

- **开发环境**：本地文件存储
- **生产环境**：OSS 对象存储（阿里云 OSS）
- **大文件上传**：自动分片上传（>10MB）

### 8. API 客户端自动生成

- 基于 OpenAPI/Swagger 规范
- 自动生成 TypeScript 客户端
- 类型安全的前后端通信

## 技术栈

### 后端

- **FastAPI**: 高性能 Python Web 框架
- **OpenAPI/Swagger**: 接口定义和文档
- **SQLAlchemy**: ORM
- **LangChain**: RAG 流程
- **ChromaDB**: 向量数据库
- **Pydantic**: 数据验证
- **python-docx**: Word 文档解析
- **python-pptx**: PowerPoint 文档解析
- **pypdf**: PDF 文档解析

### 前端

- **React + TypeScript**: 前端框架
- **Vite**: 构建工具
- **自动生成的 API 客户端**: 基于 OpenAPI
- **Tailwind CSS**: 样式框架

### RAG 服务

- **独立 Python 包**: 代码分离，易于维护
- **支持 gRPC**: 可扩展为微服务架构

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd apps/api
pip install -r requirements.txt

# 前端
cd ../../apps/web
npm install
```

### 2. 配置环境变量

创建 `apps/api/.env` 文件：

```bash
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# JWT 配置
JWT_SECRET_KEY=your-secret-key-change-in-production

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 存储配置（生产环境）
ENVIRONMENT=development  # development | production
USE_OSS_STORAGE=false    # 开发环境使用本地存储
OSS_ACCESS_KEY_ID=       # 生产环境 OSS 配置
OSS_ACCESS_KEY_SECRET=
OSS_ENDPOINT=
OSS_BUCKET_NAME=
```

### 3.2. 初始化数据库

```bash
cd apps/api
python init_db.py

# 如果已有数据库，运行迁移脚本添加新字段
python migrate_knowledge_base_types.py
```

### 4. 启动服务

```bash
# 后端（终端 1）
cd apps/api
uvicorn app:app --reload

# 前端（终端 2）
cd ../../apps/web
npm run dev
```

### 5. 生成 API 客户端（首次使用）

```bash
# 方法 1: 使用 Makefile（推荐）
make generate-api

# 方法 2: 使用 npm 脚本
cd apps/web
npm run api:update

# 方法 3: 使用 shell 脚本
./scripts/generate-api-client.sh
```

## 项目结构

```
personal_kb_project/
├── apps/                         # 各独立应用
│   ├── api/                      # FastAPI 主后端
│   ├── web/                      # React 主前端
│   ├── eval-api/                 # 评测系统后端
│   ├── eval-web/                 # 评测系统前端
│   ├── rag-service/              # RAG 独立服务
│   └── chrome-ext/               # Chrome 扩展
├── docs/                         # 文档
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_DECISION.md
│   ├── API_CLIENT_GUIDE.md
│   ├── DEPLOYMENT.md
│   ├── EVALUATION.md
│   └── evaluation-system/        # 评测系统文档
└── scripts/                      # 项目级脚本
    ├── generate-api-client.sh
    ├── generate-api-client.ps1
    └── start-evaluation.sh
```

## API 文档

启动后端后访问：

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **OpenAPI JSON**: <http://localhost:8000/openapi.json>

## 开发指南

### 添加新接口

1. 在 `apps/api/routers/` 中添加路由
2. 运行 `make generate-api` 生成客户端
3. 在代码中使用生成的 API 客户端

详细说明请参考 [API_CLIENT_GUIDE.md](./docs/API_CLIENT_GUIDE.md)

### 使用生成的 API 客户端

```typescript
import { Api } from "@/api-client";

// 调用 API
const response = await Api.DocsService.createMarkdownDoc({
  requestBody: {
    title: "新文档",
    content: "内容",
  },
});
```

## 架构文档

- [架构设计](./docs/ARCHITECTURE.md) - 系统架构和组件说明
- [架构决策](./docs/ARCHITECTURE_DECISION.md) - 技术选型说明
- [部署指南](./docs/DEPLOYMENT.md) - 生产环境部署

## 特性说明

### 存储服务

- **开发环境**：自动使用本地文件存储
- **生产环境**：自动使用 OSS 对象存储
- **大文件**：自动分片上传（>10MB）

### 文件处理

- **多格式支持**：PDF、DOCX、PPT/PPTX、Markdown
- **自动文本提取**：上传后自动提取文件中的文本内容
- **智能解析**：
  - PDF：使用 PyPDFLoader 或 pypdf 提取文本
  - DOCX：使用 python-docx 提取段落文本
  - PPT/PPTX：使用 python-pptx 提取幻灯片文本
  - Markdown：直接读取文件内容
- **向量化存储**：提取的文本自动同步到向量数据库，支持智能检索

### 知识库类型

- **文档型知识库**（默认）：
  - 用于存储和管理各种文档
  - 支持文档上传、编辑、检索
  - 适合知识管理和问答场景
- **表格型知识库**（新功能）：
  - 支持连接数据库或 Excel 表格
  - 可用于数据分析和查询
  - 配置信息安全存储在数据库中

### RAG 服务

- **Python 包模式**（默认）：直接导入，零延迟
- **gRPC 模式**（可选）：独立部署，可扩展

### API 客户端

- **自动生成**：基于 OpenAPI 规范
- **类型安全**：TypeScript 类型自动同步
- **自动更新**：接口变更时重新生成即可

## 部署

详细部署说明请参考 [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## License

MIT

<!-- todo -->

[]pdf 预览、高亮选中
[]文档编辑器高亮跳转方案
[]文本索引
