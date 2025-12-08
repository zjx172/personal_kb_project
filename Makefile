.PHONY: help generate-api export-openapi

help:
	@echo "可用命令:"
	@echo "  make generate-api    - 生成前端 API 客户端"
	@echo "  make export-openapi  - 导出 OpenAPI schema"

generate-api:
	@echo "🚀 生成 API 客户端..."
	@cd apps/api && python scripts/export_openapi.py -o ../../openapi.json
	@cd apps/web && npm run generate:api
	@echo "✅ 完成！"

export-openapi:
	@echo "📝 导出 OpenAPI schema..."
	@cd apps/api && python scripts/export_openapi.py
	@echo "✅ 完成！"

