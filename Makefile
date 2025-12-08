.PHONY: help generate-api export-openapi gen-router-stubs

help:
	@echo "可用命令:"
	@echo "  make generate-api    - 生成前端 API 客户端"
	@echo "  make export-openapi  - 导出 OpenAPI schema"

generate-api:
	@echo "🚀 生成 API 客户端..."
	@cd apps/api && python scripts/export_openapi.py -o ../web/openapi.json
	@cd apps/web && pnpm run generate:api
	@echo "✅ 完成！"

export-openapi:
	@echo "📝 导出 OpenAPI schema..."
	@cd apps/api && python scripts/export_openapi.py -o ../web/openapi.json
	@echo "✅ 完成！"

gen-router-stubs:
	@echo "🛠 生成后端路由骨架..."
	@python scripts/gen-router-stubs.py -i apps/web/openapi.json -o apps/api/routers/generated
	@echo "✅ 完成！"

