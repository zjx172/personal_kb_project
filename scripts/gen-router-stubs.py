#!/usr/bin/env python
"""
Generate FastAPI router stubs from an OpenAPI document.

- Groups operations by tag and writes to apps/api/routers/generated/<tag>.py
- Produces function signatures with path/query params and optional body
- Intended as a starting point; implementation should be filled in manually
"""
import argparse
import json
import re
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Set


def snake_case(name: str) -> str:
    cleaned = re.sub(r"[^0-9a-zA-Z]+", "_", name)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    if not cleaned:
        return "op"
    if cleaned[0].isdigit():
        cleaned = f"op_{cleaned}"
    return cleaned.lower()


def sanitize_tag(tag: str) -> str:
    return snake_case(tag)


def sanitize_operation_id(operation_id: Optional[str], method: str, path: str) -> str:
    if operation_id:
        return snake_case(operation_id)
    fallback = f"{method}_{path}"
    return snake_case(fallback)


def collect_operations(spec: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    operations_by_tag: Dict[str, List[Dict[str, Any]]] = {}
    paths = spec.get("paths", {})
    for path, methods in paths.items():
        for method, op in methods.items():
            if method.startswith("x-"):
                continue
            tags = op.get("tags") or ["default"]
            for tag in tags:
                operations_by_tag.setdefault(tag, []).append(
                    {"path": path, "method": method.lower(), "op": op}
                )
    return operations_by_tag


def build_param_signature(param: Dict[str, Any]) -> str:
    name = snake_case(param.get("name", "param"))
    required = param.get("required", False)
    location = param.get("in", "query")
    default = "" if required else " = None"
    if location == "path":
        return f"{name}: str"
    return f"{name}: Optional[str]{default}"


def build_body_param(request_body: Dict[str, Any]) -> Optional[str]:
    required = request_body.get("required", False)
    default = " = Body(...)" if required else " = Body(None)"
    return f"payload: Any{default}"


def render_operation(op_info: Dict[str, Any]) -> str:
    path = op_info["path"]
    method = op_info["method"]
    op = op_info["op"]
    summary = op.get("summary") or ""
    description = op.get("description") or ""
    operation_id = sanitize_operation_id(op.get("operationId"), method, path)

    params = op.get("parameters", [])
    param_sigs = [build_param_signature(p) for p in params]

    body_param = None
    if "requestBody" in op:
        body_param = build_body_param(op["requestBody"])
        if body_param:
            param_sigs.append(body_param)

    # Ensure router is first argument for methods to allow future dependencies if needed
    sig = ", ".join(param_sigs)
    decorator = f'@router.{method}("{path}", summary="{summary}", response_model=Any)'

    doc = description or summary or operation_id
    docstring = textwrap.indent(textwrap.dedent(f'""" {doc} """'), "    ")

    body = textwrap.indent(
        'raise NotImplementedError("Implement {op}")'.format(op=operation_id), "    "
    )

    return f"{decorator}\ndef {operation_id}({sig}):\n{docstring}\n{body}\n"


def render_file(tag: str, operations: List[Dict[str, Any]]) -> str:
    imports: Set[str] = {"APIRouter"}
    body_needed = any("requestBody" in op["op"] for op in operations)
    if body_needed:
        imports.add("Body")
    content = [
        "#!/usr/bin/env python",
        '"""',
        "Auto-generated FastAPI router stubs from OpenAPI.",
        "Do not edit manually; regenerate via scripts/gen-router-stubs.py.",
        '"""',
        "from typing import Any, Optional",
        f"from fastapi import APIRouter{', Body' if 'Body' in imports else ''}",
        "",
        "router = APIRouter()",
        "",
    ]
    for op_info in operations:
        content.append(render_operation(op_info))
    return "\n".join(content)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate FastAPI router stubs from OpenAPI.")
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path("apps/web/openapi.json"),
        help="Path to OpenAPI JSON file",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("apps/api/routers/generated"),
        help="Output directory for generated routers",
    )
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"OpenAPI file not found: {args.input}")

    spec = json.loads(args.input.read_text())
    operations_by_tag = collect_operations(spec)

    args.output.mkdir(parents=True, exist_ok=True)
    init_file = args.output / "__init__.py"
    if not init_file.exists():
        init_file.write_text("# Generated router stubs package\n")

    for tag, operations in operations_by_tag.items():
        filename = f"{sanitize_tag(tag)}.py"
        out_path = args.output / filename
        out_path.write_text(render_file(tag, operations))
        print(f"Wrote {out_path.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()

