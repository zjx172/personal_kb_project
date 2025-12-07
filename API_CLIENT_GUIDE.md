# API 客户端生成指南

本项目使用 **OpenAPI/Swagger** 作为接口定义标准，自动生成前后端代码。

## 架构

```
┌─────────────────┐
│   FastAPI       │
│   (Backend)     │
└────────┬────────┘
         │ 自动生成
         ▼
┌─────────────────┐
│  OpenAPI JSON   │
│  (openapi.json) │
└────────┬────────┘
         │ 代码生成
         ▼
┌─────────────────┐
│ TypeScript API  │
│   Client        │
│ (Frontend)      │
└─────────────────┘
```

## 工作流程

### 1. 后端：定义接口（FastAPI）

FastAPI 自动从代码生成 OpenAPI schema：

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["example"])

class ItemCreate(BaseModel):
    name: str
    description: str

@router.post("/items", response_model=Item)
def create_item(item: ItemCreate):
    """创建项目"""
    return {"id": "123", **item.dict()}
```

### 2. 导出 OpenAPI Schema

```bash
# 方法 1: 使用脚本
cd backend
python scripts/export_openapi.py

# 方法 2: 直接访问 API
curl http://localhost:8000/openapi.json > openapi.json
```

### 3. 生成前端客户端

```bash
# 方法 1: 使用 npm 脚本（推荐）
cd frontend
npm run api:update

# 方法 2: 使用 shell 脚本
./scripts/generate-api-client.sh

# 方法 3: 手动生成
cd frontend
npm run generate:api
```

## 使用生成的客户端

### 基本使用

```typescript
import { Api } from "@/api-client";

// 调用 API
const response = await Api.DocsService.createMarkdownDoc({
  requestBody: {
    title: "新文档",
    content: "内容",
  },
});

console.log(response);
```

### 替换现有 API 调用

**之前（手动编写）：**

```typescript
// src/api.ts
export async function uploadPdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await axios.post(`${API_BASE_URL}/upload-pdf`, formData);
  return resp.data;
}
```

**之后（使用生成的客户端）：**

```typescript
// 使用生成的客户端
import { Api } from "@/api-client";

export async function uploadPdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return await Api.PdfService.uploadPdf({
    requestBody: {
      file: file,
    },
  });
}
```

## 工具和库

### 后端

- **FastAPI**: 自动生成 OpenAPI schema
- **Pydantic**: 数据验证和序列化

### 前端

- **openapi-typescript-codegen**: 从 OpenAPI 生成 TypeScript 客户端
- **axios**: HTTP 客户端

## 开发流程

### 添加新接口

1. **后端**：在 `backend/routers/` 中添加路由
2. **导出 Schema**：运行 `python backend/scripts/export_openapi.py`
3. **生成客户端**：运行 `npm run api:update`（在 frontend 目录）
4. **使用客户端**：在代码中使用生成的 API 客户端

### 更新接口

1. 修改后端接口定义
2. 重新生成客户端：`npm run api:update`
3. TypeScript 会自动检查类型不匹配

## 优势

1. **类型安全**：前后端类型自动同步
2. **减少错误**：避免手动编写 API 调用代码
3. **自动更新**：接口变更时重新生成即可
4. **文档同步**：OpenAPI 文档始终与代码一致
5. **标准化**：使用行业标准的 OpenAPI 规范

## 配置

### 后端 OpenAPI 配置

在 `backend/app.py` 中：

```python
app = FastAPI(
    title="WisdomVault API",
    version="1.0.0",
    openapi_url="/openapi.json",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc
)
```

### 前端客户端配置

在 `frontend/src/api-client.ts` 中：

```typescript
OpenAPI.BASE = "http://localhost:8000";
OpenAPI.HEADERS = async () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
```

## 查看 API 文档

启动后端服务后，访问：

- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **OpenAPI JSON**: <http://localhost:8000/openapi.json>

## 常见问题

### Q: 生成的代码在哪里？

A: `frontend/src/generated/api/`

### Q: 如何自定义生成的代码？

A: 使用 `openapi-typescript-codegen` 的配置选项，或修改 `api-client.ts` 封装层

### Q: 生成的代码需要提交到 Git 吗？

A: 建议提交，这样可以确保团队使用相同的 API 客户端版本

### Q: 如何处理文件上传？

A: 文件上传需要使用 FormData，生成的客户端会自动处理

## 参考资源

- [OpenAPI 规范](https://swagger.io/specification/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [openapi-typescript-codegen](https://github.com/ferdikoomen/openapi-typescript-codegen)
