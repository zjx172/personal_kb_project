#!/bin/bash
# 生成前端 TypeScript API 客户端

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "🚀 开始生成 API 客户端..."

# 1. 导出 OpenAPI schema
echo "📝 步骤 1: 导出 OpenAPI schema..."
cd "$BACKEND_DIR"
python scripts/export_openapi.py -o "$PROJECT_ROOT/openapi.json"

# 2. 生成 TypeScript 客户端
echo "📦 步骤 2: 生成 TypeScript 客户端..."
cd "$FRONTEND_DIR"

# 检查是否安装了 openapi-typescript-codegen
if ! command -v openapi-typescript-codegen &> /dev/null; then
    echo "⚠️  openapi-typescript-codegen 未安装，正在安装..."
    npm install -g openapi-typescript-codegen
fi

# 生成客户端代码
openapi-typescript-codegen \
    --input "$PROJECT_ROOT/openapi.json" \
    --output "$FRONTEND_DIR/src/generated/api" \
    --client axios \
    --useOptions \
    --exportCore false \
    --exportServices true \
    --exportModels true \
    --exportSchemas false

echo "✅ API 客户端生成完成！"
echo "📁 生成的文件位于: $FRONTEND_DIR/src/generated/api"

