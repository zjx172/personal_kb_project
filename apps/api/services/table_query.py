import json
import logging
import re
from typing import List, Tuple

from langchain.prompts import ChatPromptTemplate

from models import DataSource, SearchHistory
from services.vector_store import llm


def clean_column_name(name):
    """清理列名，去除多余的引号和转义字符"""
    if not name:
        return name
    name = str(name).strip()
    while (name.startswith('"') and name.endswith('"')) or (name.startswith("'") and name.endswith("'")):
        name = name[1:-1].strip()
    name = name.replace('\\"', '').replace("\\'", '')
    return name.strip()


def stream_table_query(req, db, knowledge_base, search_history_id) -> Tuple[str, List[dict]]:
    """表格型知识库查询的流式生成器，返回最终答案与引用"""
    logger = logging.getLogger(__name__)
    final_answer = ""
    final_citations: List[dict] = []

    logger.info(f"开始处理表格型知识库查询: {req.question}")
    yield f"data: {json.dumps({'type': 'chunk', 'chunk': '正在分析表格数据...'}, ensure_ascii=False)}\n\n"

    data_sources = (
        db.query(DataSource)
        .filter(DataSource.knowledge_base_id == knowledge_base.id)
        .all()
    )
    if not data_sources:
        final_answer = "该知识库没有数据源，请先添加数据源。"
        yield f"data: {json.dumps({'type': 'chunk', 'chunk': '该知识库没有数据源。'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': []}, ensure_ascii=False)}\n\n"
        return final_answer, final_citations

    # 汇总 schema 与样本数据
    all_schemas = []
    sample_data = []
    for ds in data_sources:
        try:
            config = json.loads(ds.config) if ds.config else {}
            columns = []
            data = []

            if config.get("type") == "manual_table":
                data = config.get("data", [])
                columns = config.get("columns", [])
                if not columns and data:
                    columns = list(data[0].keys()) if data else []
            elif ds.type == "excel" and config.get("filename"):
                if config.get("data"):
                    data = config.get("data", [])
                    columns = config.get("columns", [])
                    if not columns and data:
                        columns = list(data[0].keys()) if data else []
            elif ds.type == "database":
                if config.get("data"):
                    data = config.get("data", [])
                    columns = config.get("columns", [])
                    if not columns and data:
                        columns = list(data[0].keys()) if data else []

            if columns:
                all_schemas.append({
                    "data_source_name": ds.name,
                    "data_source_id": ds.id,
                    "columns": columns,
                    "row_count": len(data),
                })
                sample_data.extend(data[:5])
        except Exception as e:
            logger.error(f"处理数据源 {ds.id} 失败: {str(e)}")
            continue

    if not all_schemas:
        final_answer = "没有可用的表格数据，请先添加数据源并导入数据。"
        yield f"data: {json.dumps({'type': 'chunk', 'chunk': '没有可用的表格数据。'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': []}, ensure_ascii=False)}\n\n"
        return final_answer, final_citations

    schema_info = "\n".join([
        f"数据源: {s['data_source_name']} (ID: {s['data_source_id']})\n"
        f"  列: {', '.join(s['columns'])}\n"
        f"  行数: {s['row_count']}"
        for s in all_schemas
    ])
    sample_info = ""
    if sample_data:
        sample_info = "\n样本数据（前5行）:\n" + json.dumps(sample_data[:5], ensure_ascii=False, indent=2)

    analysis_prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一个专业的数据分析助手，擅长理解自然语言查询并转换为数据筛选和统计操作。

你的任务：
1. 理解用户的查询意图（筛选、统计、排序、查找等）
2. 根据可用的列名，生成精确的筛选条件
3. 识别统计需求（计数、求和、平均值、最大值、最小值等）
4. 识别排序需求（按某列升序/降序）
5. 识别限制需求（只显示前N条）

筛选条件类型：
- 文本匹配：{{"列名": "关键词"}} - 用于模糊匹配
- 数值比较：{{"列名": ">100"}} 或 {{"列名": "<50"}} 或 {{"列名": ">=1000"}}
- 范围查询：{{"列名": "100-200"}} 或 {{"列名": ">=100,<=200"}}
- 多条件：{{"列名1": "值1", "列名2": "值2"}}

返回 JSON 格式（必须严格遵循）：
{{
    "filters": {{
        "列名": "筛选值或条件"
    }},
    "statistics": null 或 "count" 或 "sum" 或 "avg" 或 "max" 或 "min",
    "statistics_column": null 或 "列名",
    "sort_by": null 或 "列名",
    "sort_order": null 或 "asc" 或 "desc",
    "limit": null 或 数字,
    "explanation": "简要说明查询意图"
}}

示例：
- "显示销售额大于1000的记录" -> {{"filters": {{"销售额": ">1000"}}, "statistics": null}}
- "总共有多少条记录" -> {{"filters": {{}}, "statistics": "count"}}
- "销售额的平均值是多少" -> {{"filters": {{}}, "statistics": "avg", "statistics_column": "销售额"}}
- "显示价格最高的前10个商品" -> {{"filters": {{}}, "sort_by": "价格", "sort_order": "desc", "limit": 10}}
- "2024年销售额大于1000的记录，按销售额降序" -> {{"filters": {{"年份": "2024", "销售额": ">1000"}}, "sort_by": "销售额", "sort_order": "desc"}}"""),
        ("human", """用户查询: {question}

可用的数据源和列:
{schemas}

{samples}

请仔细分析查询意图，返回 JSON 格式的筛选条件、统计需求、排序和限制。只返回 JSON，不要其他文字。""")
    ])

    analysis_messages = analysis_prompt.format_messages(
        question=req.question,
        schemas=schema_info,
        samples=sample_info
    )

    try:
        analysis_response = llm.invoke(analysis_messages)
        analysis_text = analysis_response.content if hasattr(analysis_response, "content") else str(analysis_response)
        logger.info(f"LLM 分析结果: {analysis_text[:200]}")
    except Exception as e:
        final_answer = f"分析查询时出现错误: {str(e)}"
        logger.error(final_answer)
        yield f"data: {json.dumps({'type': 'chunk', 'chunk': '分析查询时出现错误。'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': []}, ensure_ascii=False)}\n\n"
        return final_answer, final_citations

    try:
        json_match = re.search(r"\{[^{}]*\}", analysis_text, re.DOTALL)
        if json_match:
            analysis_result = json.loads(json_match.group())
            logger.info(f"解析后的分析结果: {json.dumps(analysis_result, ensure_ascii=False)}")
        else:
            logger.warning(f"无法从 LLM 响应中提取 JSON，原始文本: {analysis_text[:500]}")
            analysis_result = {"filters": {}, "statistics": None, "explanation": analysis_text}
    except (json.JSONDecodeError, ValueError, Exception) as e:
        logger.warning(f"解析 LLM 分析结果失败: {str(e)}，原始文本: {analysis_text[:500]}")
        analysis_result = {"filters": {}, "statistics": None, "explanation": analysis_text}

    if "filters" in analysis_result and isinstance(analysis_result["filters"], dict):
        cleaned_filters = {}
        for key, value in analysis_result["filters"].items():
            cleaned_filters[clean_column_name(key)] = value
        analysis_result["filters"] = cleaned_filters
    if "statistics_column" in analysis_result:
        analysis_result["statistics_column"] = clean_column_name(analysis_result["statistics_column"])
    if "sort_by" in analysis_result:
        analysis_result["sort_by"] = clean_column_name(analysis_result["sort_by"])

    query_results = []
    logger.info(f"开始查询 {len(all_schemas)} 个数据源，筛选条件: {analysis_result.get('filters', {})}")
    for schema in all_schemas:
        ds_id = schema["data_source_id"]
        filters = analysis_result.get("filters", {})
        try:
            data_source = db.query(DataSource).filter(DataSource.id == ds_id).first()
            if not data_source:
                continue
            config = json.loads(data_source.config) if data_source.config else {}
            all_data = []
            columns = []

            if config.get("type") == "manual_table":
                all_data = config.get("data", [])
                columns = config.get("columns", [])
                if not columns and all_data:
                    columns = list(all_data[0].keys()) if all_data else []
            elif data_source.type == "excel" and config.get("filename"):
                if config.get("data"):
                    all_data = config.get("data", [])
                    columns = config.get("columns", [])
                    if not columns and all_data:
                        columns = list(all_data[0].keys()) if all_data else []
            elif data_source.type == "database":
                if config.get("data"):
                    all_data = config.get("data", [])
                    columns = config.get("columns", [])
                    if not columns and all_data:
                        columns = list(all_data[0].keys()) if all_data else []

            logger.info(f"数据源 {ds_id} ({data_source.name}): 共 {len(all_data)} 行数据，{len(columns)} 列: {columns}")
            if not columns and all_data:
                columns = list(all_data[0].keys()) if all_data else []

            filtered_data = all_data
            if filters:
                filtered_data = []
                invalid_columns = []
                for row in all_data:
                    match = True
                    for column, filter_value in filters.items():
                        original_column = column
                        column = clean_column_name(column)
                        column_found = False
                        actual_column = None
                        for col in columns:
                            if col.lower() == column.lower():
                                column_found = True
                                actual_column = col
                                break
                        if not column_found:
                            if column not in invalid_columns:
                                invalid_columns.append(column)
                                logger.warning(f"列 '{column}' (原始: '{original_column}') 不存在于数据源 {ds_id}，可用列: {columns}")
                            continue
                        if not filter_value or not str(filter_value).strip():
                            continue
                        column = actual_column
                        if not column or not isinstance(column, str):
                            logger.warning(f"无效的列名: {column}，跳过此筛选条件")
                            continue
                        if not isinstance(row, dict):
                            logger.warning(f"数据行不是字典类型: {type(row)}")
                            match = False
                            break
                        if column not in row:
                            logger.debug(f"列 '{column}' 不在数据行中，可用键: {list(row.keys())}")
                            continue

                        cell_value = row.get(column, "")
                        filter_str = str(filter_value).strip()
                        try:
                            cell_num = float(cell_value) if cell_value else 0
                            if filter_str.startswith(">="):
                                if cell_num < float(filter_str[2:].strip()):
                                    match = False
                                    break
                            elif filter_str.startswith("<="):
                                if cell_num > float(filter_str[2:].strip()):
                                    match = False
                                    break
                            elif filter_str.startswith(">"):
                                if cell_num <= float(filter_str[1:].strip()):
                                    match = False
                                    break
                            elif filter_str.startswith("<"):
                                if cell_num >= float(filter_str[1:].strip()):
                                    match = False
                                    break
                            elif "-" in filter_str and not filter_str.startswith("-"):
                                parts = filter_str.split("-")
                                if len(parts) == 2:
                                    min_val = float(parts[0].strip())
                                    max_val = float(parts[1].strip())
                                    if not (min_val <= cell_num <= max_val):
                                        match = False
                                        break
                            else:
                                try:
                                    if abs(cell_num - float(filter_str)) > 0.01:
                                        match = False
                                        break
                                except ValueError:
                                    if filter_str.lower() not in str(cell_value).lower():
                                        match = False
                                        break
                        except (ValueError, TypeError):
                            if filter_str.lower() not in str(cell_value).lower():
                                match = False
                                break
                    if match:
                        filtered_data.append(row)

            sort_by = analysis_result.get("sort_by")
            sort_order = analysis_result.get("sort_order", "asc")
            if sort_by:
                sort_by = clean_column_name(sort_by)
                sort_column = None
                for col in columns:
                    if col.lower() == sort_by.lower():
                        sort_column = col
                        break
                sort_by = sort_column
            if sort_by and sort_by in columns:
                try:
                    filtered_data.sort(
                        key=lambda x: float(x.get(sort_by, 0))
                        if str(x.get(sort_by, "")).replace(".", "").replace("-", "").isdigit()
                        else str(x.get(sort_by, "")),
                        reverse=(sort_order == "desc"),
                    )
                except (ValueError, TypeError, KeyError) as e:
                    logger.warning(f"排序失败: {str(e)}，使用文本排序")
                    try:
                        filtered_data.sort(
                            key=lambda x: str(x.get(sort_by, "")),
                            reverse=(sort_order == "desc"),
                        )
                    except Exception as e2:
                        logger.error(f"文本排序也失败: {str(e2)}，跳过排序")

            limit = analysis_result.get("limit")
            if limit and isinstance(limit, int) and limit > 0:
                filtered_data = filtered_data[:limit]

            stat_type = analysis_result.get("statistics")
            stat_column = analysis_result.get("statistics_column")
            if stat_type:
                if stat_type == "count":
                    result_value = len(filtered_data)
                    query_results.append({
                        "data_source": schema["data_source_name"],
                        "result": f"共 {result_value} 条记录",
                        "data": filtered_data[:10] if not stat_type else [],
                        "total": len(filtered_data),
                        "statistics": {"type": "count", "value": result_value}
                    })
                elif stat_type in ["sum", "avg", "max", "min"] and stat_column:
                    stat_column = clean_column_name(stat_column)
                    stat_column_found = None
                    for col in columns:
                        if col.lower() == stat_column.lower():
                            stat_column_found = col
                            break
                    stat_column = stat_column_found

                if stat_type in ["sum", "avg", "max", "min"] and stat_column and stat_column in columns:
                    try:
                        values = []
                        for row in filtered_data:
                            if not isinstance(row, dict):
                                logger.warning(f"数据行不是字典类型: {type(row)}")
                                continue
                            if stat_column not in row:
                                logger.debug(f"列 '{stat_column}' 不在数据行中，可用键: {list(row.keys())}")
                                continue
                            val = row.get(stat_column)
                            if val is not None and val != "":
                                try:
                                    values.append(float(val))
                                except (ValueError, TypeError):
                                    pass

                        if values:
                            if stat_type == "sum":
                                result_value = sum(values)
                                result_text = f"总和: {result_value:,.2f}"
                            elif stat_type == "avg":
                                result_value = sum(values) / len(values)
                                result_text = f"平均值: {result_value:,.2f}"
                            elif stat_type == "max":
                                result_value = max(values)
                                result_text = f"最大值: {result_value:,.2f}"
                            elif stat_type == "min":
                                result_value = min(values)
                                result_text = f"最小值: {result_value:,.2f}"
                            else:
                                result_text = f"找到 {len(filtered_data)} 条记录"

                            query_results.append({
                                "data_source": schema["data_source_name"],
                                "result": result_text,
                                "data": filtered_data[:10],
                                "total": len(filtered_data),
                                "statistics": {"type": stat_type, "column": stat_column, "value": result_value}
                            })
                        else:
                            query_results.append({
                                "data_source": schema["data_source_name"],
                                "result": f"找到 {len(filtered_data)} 条记录，但无法计算统计值（列 '{stat_column}' 没有有效数值）",
                                "data": filtered_data[:10],
                                "total": len(filtered_data)
                            })
                    except Exception as e:
                        logger.error(f"计算统计值失败: {str(e)}")
                        query_results.append({
                            "data_source": schema["data_source_name"],
                            "result": f"找到 {len(filtered_data)} 条匹配记录",
                            "data": filtered_data[:10],
                            "total": len(filtered_data)
                        })
                elif stat_type and stat_type != "count":
                    query_results.append({
                        "data_source": schema["data_source_name"],
                        "result": f"找到 {len(filtered_data)} 条匹配记录",
                        "data": filtered_data[:10],
                        "total": len(filtered_data)
                    })
            else:
                query_results.append({
                    "data_source": schema["data_source_name"],
                    "result": f"找到 {len(filtered_data)} 条匹配记录" + (f"（显示前 {min(len(filtered_data), limit or 10)} 条）" if limit else ""),
                    "data": filtered_data[:10],
                    "total": len(filtered_data)
                })
        except Exception as e:
            logger.error(f"查询数据源 {ds_id} 失败: {str(e)}", exc_info=True)
            query_results.append({
                "data_source": schema.get("data_source_name", "未知数据源"),
                "result": f"查询失败: {str(e)}",
                "data": [],
                "total": 0
            })

    logger.info(f"查询完成，找到 {len(query_results)} 个结果")
    if not query_results:
        final_answer = "根据您的查询条件，没有找到匹配的数据。请尝试调整筛选条件或检查数据源。"
        yield f"data: {json.dumps({'type': 'chunk', 'chunk': '没有找到匹配的数据。'}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': []}, ensure_ascii=False)}\n\n"
        if search_history_id:
            try:
                search_history = db.query(SearchHistory).filter(SearchHistory.id == search_history_id).first()
                if search_history:
                    search_history.answer = "没有找到匹配的数据"
                    db.commit()
            except Exception as e:
                logger.error(f"更新搜索历史失败: {str(e)}")
        return final_answer, final_citations

    results_summary = "\n".join([
        f"- {r['data_source']}: {r['result']}" +
        (f" (共 {r['total']} 条)" if r.get('total', 0) > 0 else "")
        for r in query_results
    ])
    detailed_data = []
    for r in query_results:
        if r.get("data"):
            detailed_data.append({
                "data_source": r["data_source"],
                "sample": r["data"][:3],
                "total": r["total"]
            })
    detailed_info = ""
    if detailed_data:
        detailed_info = "\n\n详细数据示例:\n" + json.dumps(detailed_data, ensure_ascii=False, indent=2)

    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", """你是一个专业的数据分析助手。根据查询结果生成清晰、有用的自然语言回答。

要求：
1. 直接回答用户的问题，不要重复问题
2. 如果查询结果是统计值（如总数、平均值等），直接给出数值
3. 如果查询结果是数据列表：
   - 说明找到的记录数量
   - 如果记录数较少（≤5条），可以列出所有记录的关键信息
   - 如果记录数较多，说明数量并提示可以查看详细数据
4. 如果涉及多个数据源，分别说明每个数据源的结果
5. 使用专业但友好的语气
6. 如果查询结果为空，明确说明没有找到匹配的数据"""),
        ("human", """用户查询: {question}

查询结果:
{results}
{detailed}

请生成清晰、有用的回答。""")
    ])
    answer_messages = answer_prompt.format_messages(
        question=req.question,
        results=results_summary,
        detailed=detailed_info
    )

    answer_chunks = []
    try:
        logger.info("开始使用 LLM 生成回答")
        for chunk in llm.stream(answer_messages):
            if hasattr(chunk, "content") and chunk.content:
                content = chunk.content
                answer_chunks.append(content)
                yield f"data: {json.dumps({'type': 'chunk', 'chunk': content}, ensure_ascii=False)}\n\n"
        logger.info(f"LLM 生成回答完成，共 {len(answer_chunks)} 个片段")
    except Exception as e:
        logger.error(f"LLM 生成回答失败: {str(e)}", exc_info=True)
        answer_chunks = [results_summary]
        yield f"data: {json.dumps({'type': 'chunk', 'chunk': results_summary}, ensure_ascii=False)}\n\n"

    final_answer = "".join(answer_chunks) if answer_chunks else results_summary
    if not final_answer or not final_answer.strip():
        final_answer = results_summary if results_summary else "查询完成，但没有生成回答。"
        logger.warning("最终回答为空，使用备用回答")

    logger.info(f"最终回答长度: {len(final_answer)}")

    final_citations = []
    for idx, result in enumerate(query_results):
        final_citations.append({
            "index": idx + 1,
            "source": f"数据源: {result['data_source']}",
            "title": result["data_source"],
            "snippet": result.get("result", f"找到 {result.get('total', 0)} 条记录"),
            "doc_id": None,
            "page": None,
            "chunk_index": None,
            "chunk_position": None,
        })

    yield f"data: {json.dumps({'type': 'citations', 'citations': final_citations}, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps({'type': 'final', 'answer': final_answer, 'citations': final_citations}, ensure_ascii=False)}\n\n"

    if search_history_id:
        try:
            search_history = db.query(SearchHistory).filter(SearchHistory.id == search_history_id).first()
            if search_history:
                search_history.answer = final_answer
                search_history.citations = json.dumps(final_citations, ensure_ascii=False)
                search_history.sources_count = len(final_citations)
                db.commit()
        except Exception as e:
            logger.error(f"更新搜索历史失败: {str(e)}")

    return final_answer, final_citations

