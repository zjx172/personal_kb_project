#!/bin/bash

# 修复 sharp 模块安装问题

echo "🔧 修复 sharp 模块..."

# 进入 sharp 目录并手动构建
SHARP_DIR="node_modules/.pnpm/sharp@0.32.6/node_modules/sharp"

if [ -d "$SHARP_DIR" ]; then
  echo "📦 找到 sharp 模块，正在构建..."
  cd "$SHARP_DIR"
  npm run install
  cd - > /dev/null
  echo "✅ sharp 构建完成"
else
  echo "❌ 未找到 sharp 模块"
  exit 1
fi

