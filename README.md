# Personal Knowledge Base Project

一个基于 RAG (Retrieval-Augmented Generation) 的个人知识库系统，支持文档管理、向量检索和智能问答，集成 Google OAuth 登录认证。

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

- 支持创建多个独立的知识库
- 每个知识库拥有独立的文档和对话
- 知识库切换和编辑功能
- 默认知识库自动创建
- 基于知识库的路由系统（`/kb/:knowledgeBaseId`）

### 5. 文档管理

- 在线编辑 Markdown 文档（飞书风格）
- 支持主题标签和文档类型分类
- 网页内容提取并转换为 Markdown
- 文档自动同步到向量库
- AI 自动生成摘要和推荐标签
- 文档关系图谱可视化
- 文档按知识库隔离管理

### 6. 前端功能

- Google 登录界面
- 对话式检索界面
- 答案中的引用标号可点击，跳转到对应文档
- 支持按引用高亮对应原文段落
- 文档列表和编辑界面
- 知识图谱可视化
- 知识库选择器和切换功能
- 基于知识库的路由导航

### 7. Chrome 浏览器插件

- 🔐 Google OAuth 登录集成
- 📄 一键保存当前网页到知识库
- 🎯 自动提取网页正文内容
- 📝 支持自定义标题
- 💾 Token 自动管理
- 🔄 实时同步登录状态

## 技术栈

### 后端

- **FastAPI** - Web 框架
- **SQLAlchemy** - ORM (SQLite)
- **LangChain** - LLM 应用框架
- **Chroma** - 向量数据库
- **OpenAI API** - Embeddings & LLM
- **python-jose** - JWT Token 处理
- **authlib** - OAuth 2.0 客户端
- **pyjwt** - JWT 编码/解码

### 前端

- **React 18** + **TypeScript** - UI 框架
- **Vite** - 构建工具
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Tailwind CSS** - 样式框架
- **Radix UI** - UI 组件库
- **Sonner** - Toast 通知
- **Lucide React** - 图标库

### Chrome 插件

- **Plasmo** - 现代浏览器扩展开发框架（基于 Vite）
- **React 18** + **TypeScript** - UI 框架
- **Chrome Extension Manifest V3** - 最新扩展标准
- **Chrome Storage API** - 本地存储
- **Chrome Tabs API** - 标签页管理

## 安装和运行

### 前置要求

- Python 3.9+
- Node.js 18+
- pnpm (推荐) 或 npm

### 1. 克隆项目

```bash
git clone <repository-url>
cd personal_kb_project
```

### 2. 后端设置

#### 安装依赖

```bash
cd backend
pip3 install -r requirements.txt
```

#### 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Google OAuth 配置
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# JWT 配置
JWT_SECRET_KEY=your-random-secret-key
```

**获取 Google OAuth 凭据：**

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用 Google+ API
3. 配置 OAuth 同意屏幕
4. 创建 OAuth 2.0 客户端 ID（Web 应用类型）
5. 添加授权重定向 URI: `http://localhost:8000/auth/google/callback`
6. 复制客户端 ID 和密钥到 `.env` 文件

**生成 JWT Secret Key：**

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### 初始化数据库

```bash
python3 init_db.py
```

#### 启动后端服务

```bash
python3 -m uvicorn app:app --reload --port 8000
```

### 3. 前端设置

#### 安装前端依赖

```bash
cd frontend
pnpm install
```

#### 启动开发服务器

```bash
pnpm run dev
```

前端将在 `http://localhost:5173` 运行。

### 4. Chrome 插件设置

#### 安装插件依赖

```bash
cd chrome-extension
pnpm install
```

#### 开发模式

```bash
pnpm dev
```

#### 构建插件

```bash
pnpm build
```

#### 加载到 Chrome

1. 运行 `pnpm build` 构建插件
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `chrome-extension/build/chrome-mv3-dev` 目录
6. 插件图标将出现在浏览器工具栏中

## 使用说明

### 首次使用

1. 访问 `http://localhost:5173`
2. 点击"使用 Google 登录"按钮
3. 使用 Google 账号登录
4. 登录成功后自动跳转到首页

### Web 应用功能

1. **管理知识库**：

   - 在左上角的知识库选择器中切换知识库
   - 点击"新建知识库"创建新的知识库
   - 悬停在知识库名称上，点击编辑图标可修改名称
   - 每个知识库拥有独立的文档和对话列表

2. **创建文档**：在左侧边栏点击"新建文档"或使用"提取网页内容"功能（文档会保存到当前选中的知识库）

3. **编辑文档**：点击文档列表中的文档进行编辑，支持设置主题标签和文档类型

4. **搜索知识库**：在主界面输入问题，系统会从当前知识库中检索相关文档并生成答案。如果没有选中对话，系统会自动创建新对话

5. **查看引用**：答案中的引用标号（如 [1], [2]）可点击，会跳转到对应文档并高亮相关段落

6. **知识图谱**：访问 `/kb/:knowledgeBaseId/graph` 页面查看当前知识库的文档关系图谱

7. **路由结构**：
   - `/kb/:knowledgeBaseId` - 知识库主页（对话界面）
   - `/kb/:knowledgeBaseId/doc/:id` - 文档编辑页
   - `/kb/:knowledgeBaseId/graph` - 知识图谱页
   - 访问根路径 `/` 会自动重定向到默认知识库

### Chrome 插件使用

1. **首次使用**：

   - 点击浏览器工具栏中的插件图标
   - 点击"使用 Google 登录"按钮
   - 在新标签页完成 Google 登录
   - 登录成功后，插件会自动检测并更新状态

2. **保存网页**：

   - 在任意网页浏览时，点击插件图标
   - 点击"保存当前页面"按钮
   - 网页内容会自动提取并保存到知识库
   - 保存成功后，可以在 Web 应用中查看该文档

3. **功能特点**：
   - 自动提取网页正文，过滤广告和无关内容
   - 保留原始 URL 作为来源链接
   - 支持自定义标题（使用网页标题或手动输入）
   - Token 自动管理，无需重复登录

## 项目结构

```text
personal_kb_project/
├── backend/
│   ├── app.py              # FastAPI 主应用
│   ├── auth.py              # 认证相关函数（JWT、用户管理）
│   ├── models.py            # 数据模型（User, KnowledgeBase, MarkdownDoc, Conversation, Highlight 等）
│   ├── db.py                # 数据库配置
│   ├── config.py             # 配置文件
│   ├── routers/              # API 路由模块
│   │   ├── knowledge_bases.py  # 知识库路由
│   │   ├── conversations.py    # 对话路由
│   │   ├── docs.py              # 文档路由
│   │   ├── pdf.py               # PDF 路由
│   │   └── search.py            # 搜索路由
│   ├── retrieval.py          # 向量检索服务层
│   ├── rag_pipeline.py       # RAG Pipeline
│   ├── hybrid_search.py      # 混合搜索服务
│   ├── ai_services.py        # AI 服务（摘要、标签推荐等）
│   ├── ingest.py             # 文档导入脚本
│   ├── migrate_knowledge_bases.py  # 知识库数据库迁移脚本
│   ├── requirements.txt      # Python 依赖
│   ├── .env                  # 环境变量（需自行创建）
│   └── kb.db                 # SQLite 数据库
│
└── frontend/
    ├── src/
    │   ├── pages/            # 页面组件
    │   │   ├── HomePage.tsx  # 首页（搜索界面，支持知识库路由）
    │   │   ├── DocPage.tsx   # 文档编辑页（支持知识库路由）
    │   │   ├── GraphPage.tsx # 知识图谱页（支持知识库路由）
    │   │   └── LoginPage.tsx # 登录页
    │   ├── components/       # 通用组件
    │   │   ├── home/         # 首页相关组件
    │   │   │   ├── Sidebar.tsx
    │   │   │   ├── DocList.tsx
    │   │   │   ├── ConversationList.tsx
    │   │   │   └── KnowledgeBaseSelector.tsx
    │   │   ├── AnswerWithCitations.tsx
    │   │   ├── SearchFilters.tsx
    │   │   ├── KnowledgeBaseRedirect.tsx  # 知识库重定向组件
    │   │   └── ui/           # UI 组件库
    │   ├── hooks/            # React Hooks
    │   │   ├── useKnowledgeBases.ts  # 知识库管理 Hook
    │   │   ├── useConversations.ts   # 对话管理 Hook
    │   │   ├── useDocs.ts            # 文档管理 Hook
    │   │   ├── useStreamQuery.ts     # 流式查询 Hook
    │   │   ├── useWebExtract.ts      # 网页提取 Hook
    │   │   └── usePdfUpload.ts       # PDF 上传 Hook
    │   ├── contexts/         # React Context
    │   │   └── AuthContext.tsx  # 认证上下文
    │   ├── api.ts            # API 接口封装
    │   └── utils/            # 工具函数
    ├── package.json
    └── vite.config.ts
│
└── chrome-extension/
    ├── popup.tsx             # 插件弹窗 UI
    ├── popup.css             # 弹窗样式
    ├── background.ts         # 后台脚本（处理 OAuth 回调）
    ├── content.ts            # 内容脚本（可选）
    ├── options.tsx           # 设置页面（可选）
    ├── utils/
    │   └── api.ts            # API 封装（登录、保存网页）
    ├── package.json          # 插件配置
    ├── tsconfig.json         # TypeScript 配置
    └── README.md             # 插件使用说明
```

## API 端点

### 认证相关

- `GET /auth/google` - 获取 Google OAuth 授权 URL
- `GET /auth/google/callback` - Google OAuth 回调处理
- `GET /auth/me` - 获取当前用户信息
- `POST /auth/logout` - 登出

### 知识库相关

- `GET /knowledge-bases` - 获取知识库列表（当前用户）
- `POST /knowledge-bases` - 创建知识库
- `GET /knowledge-bases/{kb_id}` - 获取知识库详情
- `PUT /knowledge-bases/{kb_id}` - 更新知识库
- `DELETE /knowledge-bases/{kb_id}` - 删除知识库

### 对话相关

- `GET /conversations` - 获取对话列表（支持按知识库过滤）
- `POST /conversations` - 创建对话（需指定知识库 ID）
- `GET /conversations/{conv_id}` - 获取对话详情
- `PUT /conversations/{conv_id}` - 更新对话
- `DELETE /conversations/{conv_id}` - 删除对话

### 文档相关

- `GET /docs` - 获取文档列表（支持按知识库过滤）
- `POST /docs` - 创建文档（需指定知识库 ID）
- `GET /docs/{doc_id}` - 获取文档详情
- `PUT /docs/{doc_id}` - 更新文档
- `DELETE /docs/{doc_id}` - 删除文档
- `POST /extract-web` - 提取网页内容（需指定知识库 ID）
- `POST /upload-pdf` - 上传 PDF 文档（需指定知识库 ID）

### 知识库查询

- `POST /query` - 查询知识库（流式返回，需指定知识库 ID 和可选的对话 ID）

### 智能功能

- `POST /docs/{doc_id}/generate-summary` - 生成文档摘要
- `POST /docs/{doc_id}/recommend-tags` - 推荐标签
- `GET /docs/{doc_id}/related` - 获取相关文档
- `GET /docs/graph` - 获取文档关系图谱

## 配置说明

### 后端配置 (`backend/config.py`)

主要配置项通过环境变量设置：

- `OPENAI_API_KEY`: OpenAI API 密钥
- `OPENAI_BASE_URL`: OpenAI API 基础 URL
- `GOOGLE_CLIENT_ID`: Google OAuth 客户端 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 客户端密钥
- `GOOGLE_REDIRECT_URI`: OAuth 回调 URI
- `JWT_SECRET_KEY`: JWT 签名密钥

### 前端配置

API 基础 URL 在 `frontend/src/api.ts` 中配置：

```typescript
const API_BASE_URL = "http://localhost:8000";
```

### Chrome 插件配置

API 基础 URL 在 `chrome-extension/utils/api.ts` 中配置：

```typescript
const API_BASE_URL = "http://localhost:8000";
```

**注意**：如果后端运行在不同的地址，需要同时更新前端和插件的 API_BASE_URL。

## 开发说明

### 数据库迁移

#### 初始化数据库

首次使用或需要清空数据时：

```bash
cd backend
python3 init_db.py
```

**注意**：这会清空现有数据，生产环境请使用数据库迁移工具。

#### 知识库功能迁移

如果从旧版本升级到支持多知识库的版本，需要运行迁移脚本：

```bash
cd backend
python3 migrate_knowledge_bases.py
```

这个脚本会：

- 创建 `knowledge_bases` 表
- 为每个现有用户创建默认知识库
- 将现有的对话和文档关联到默认知识库
- 添加 `knowledge_base_id` 字段到相关表

### 添加新功能

1. 后端：在 `app.py` 中添加新的 API 端点
2. 前端：在 `api.ts` 中添加 API 调用函数，在相应页面中使用
3. Chrome 插件：在 `utils/api.ts` 中添加 API 调用，在 `popup.tsx` 中使用

### Chrome 插件开发

插件使用 Plasmo 框架开发，支持热更新：

```bash
cd chrome-extension
pnpm dev  # 开发模式，自动监听文件变化并重新构建
```

**热更新工作流**：

1. **启动开发服务器**：运行 `pnpm dev`
2. **修改代码**：编辑 `popup.tsx`、`background.ts` 等文件
3. **重新加载插件**：在 `chrome://extensions/` 页面点击插件的"重新加载"按钮（🔄）
4. **查看变化**：重新打开 popup 或刷新相关页面

**自动重载（可选）**：

- 安装 [plasmo-reload](https://github.com/PlasmoHQ/plasmo-reload) Chrome 扩展
- 安装后，代码修改会自动触发插件重载，无需手动点击

**调试技巧**：

- **Popup 调试**：右键点击插件图标 → "检查弹出内容"
- **Background 调试**：在 `chrome://extensions/` 中点击插件的"service worker"链接
- **查看日志**：在 DevTools Console 中查看 `console.log` 输出

**详细开发指南**：查看 `chrome-extension/DEVELOPMENT.md`

## 注意事项

1. **环境变量安全**：不要将 `.env` 文件提交到版本控制系统
2. **JWT Secret Key**：生产环境请使用强随机字符串
3. **CORS 配置**：生产环境需要更新 `app.py` 中的 CORS 配置
4. **数据库备份**：定期备份 `kb.db` 文件
5. **Google OAuth**：生产环境需要在 Google Cloud Console 添加实际域名
6. **Chrome 插件权限**：插件需要 `activeTab` 和 `storage` 权限，以及访问 `localhost:8000` 的权限
7. **插件 API 地址**：确保后端服务运行在 `http://localhost:8000`，或修改插件中的 API_BASE_URL

## 许可证

MIT License
