# PowerShell 脚本：生成前端 TypeScript API 客户端

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$BACKEND_DIR = Join-Path $PROJECT_ROOT "apps/api"
$FRONTEND_DIR = Join-Path $PROJECT_ROOT "apps/web"

Write-Host "🚀 开始生成 API 客户端..." -ForegroundColor Green

# 1. 导出 OpenAPI schema
Write-Host "📝 步骤 1: 导出 OpenAPI schema..." -ForegroundColor Cyan
Set-Location $BACKEND_DIR
python scripts/export_openapi.py -o "$PROJECT_ROOT\openapi.json"

# 2. 生成 TypeScript 客户端
Write-Host "📦 步骤 2: 生成 TypeScript 客户端..." -ForegroundColor Cyan
Set-Location $FRONTEND_DIR

# 检查是否安装了 openapi-typescript-codegen
$openapiCli = Get-Command openapi-typescript-codegen -ErrorAction SilentlyContinue
if (-not $openapiCli) {
    Write-Host "⚠️  openapi-typescript-codegen 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g openapi-typescript-codegen
}

# 生成客户端代码
$openapiJson = Join-Path $PROJECT_ROOT "openapi.json"
$outputDir = Join-Path $FRONTEND_DIR "src\generated\api"

openapi-typescript-codegen `
    --input $openapiJson `
    --output $outputDir `
    --client axios `
    --useOptions `
    --exportCore false `
    --exportServices true `
    --exportModels true `
    --exportSchemas false

Write-Host "✅ API 客户端生成完成！" -ForegroundColor Green
Write-Host "📁 生成的文件位于: $outputDir" -ForegroundColor Cyan

