#!/bin/bash

# Chrome 插件自动重载脚本
# 使用方法：在开发时运行此脚本，会自动重载插件

EXTENSION_ID=$(grep -o '"id": "[^"]*"' build/chrome-mv3-dev/manifest.json | cut -d'"' -f4)

if [ -z "$EXTENSION_ID" ]; then
  echo "❌ 未找到扩展 ID，请先运行 pnpm dev"
  exit 1
fi

echo "🔄 重载扩展: $EXTENSION_ID"

# 使用 Chrome 的扩展管理 API 重载扩展
# 注意：需要在 Chrome 中启用扩展管理 API
chrome-cli reload-extension "$EXTENSION_ID" 2>/dev/null || {
  echo "⚠️  自动重载失败，请手动在 chrome://extensions/ 中点击重载按钮"
  echo "📋 扩展 ID: $EXTENSION_ID"
}

