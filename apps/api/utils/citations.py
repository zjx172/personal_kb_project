from schemas import Citation


def build_citation(index, source, title="", snippet="", doc_id=None, page=None, chunk_index=None, chunk_position=None):
    return {
        "index": index,
        "source": source,
        "title": title,
        "snippet": snippet,
        "doc_id": doc_id,
        "page": page,
        "chunk_index": chunk_index,
        "chunk_position": chunk_position,
    }


def citations_from_search_results(search_results):
    """
    混合检索结果转 citations。
    """
    citations = []
    for result in search_results:
        chunk_index = result.get("chunk_index")
        chunk_position = None
        if chunk_index is not None:
            chunk_position = f"第 {chunk_index + 1} 段"

        snippet = result.get("content", "")
        if len(snippet) > 200:
            snippet = snippet[:200] + "..."

        citations.append(
            build_citation(
                index=result["index"],
                source=result["source"],
                title=result.get("title", ""),
                snippet=snippet,
                doc_id=result.get("doc_id"),
                page=result.get("page"),
                chunk_index=chunk_index,
                chunk_position=chunk_position,
            )
        )
    return citations


def citations_from_rag_items(items):
    """
    将 RAG 流结果中的 citations 转为 dict 列表。
    """
    return [
        Citation(
            index=c["index"],
            source=c["source"],
            title=c.get("title"),
            snippet=c["snippet"],
            doc_id=c.get("doc_id"),
            page=c.get("page"),
        ).dict()
        for c in items
    ]

