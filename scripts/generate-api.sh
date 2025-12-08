#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/api"
FRONTEND_DIR="$ROOT_DIR/apps/web"
OUT_FILE="$FRONTEND_DIR/openapi.json"

echo "📝 导出 OpenAPI schema -> $OUT_FILE"
cd "$BACKEND_DIR"
python scripts/export_openapi.py -o "$OUT_FILE"

echo "🚀 生成前端 API 客户端"
cd "$FRONTEND_DIR"
pnpm run generate:api

echo "✅ 完成"

