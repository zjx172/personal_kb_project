"""
导出 OpenAPI 规范文件
用于生成前端 TypeScript 客户端
"""
import json
import sys
from pathlib import Path
from typing import Optional, Union

# 添加项目根目录到路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app import app

def export_openapi(output_path: Optional[Union[str, Path]] = None):
    """导出 OpenAPI JSON 文件"""
    if output_path is None:
        output_path = PROJECT_ROOT / "openapi.json"
    else:
        if isinstance(output_path, str):
            output_path = Path(output_path)
        # 如果已经是 Path，直接使用
    
    # 获取 OpenAPI schema
    openapi_schema = app.openapi()
    
    # 保存到文件
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False)
    
    print(f"✅ OpenAPI schema 已导出到: {output_path}")
    return output_path

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="导出 OpenAPI 规范")
    parser.add_argument(
        "-o", "--output",
        help="输出文件路径（默认: openapi.json）",
        default=None
    )
    args = parser.parse_args()
    export_openapi(args.output)

