import React, { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Citation } from "../api";
import { markdownToHtml } from "../utils/markdown";

interface AnswerWithCitationsProps {
  answer: string;
  citations: Citation[];
}

/**
 * 渲染答案，将引用标号 [1], [2] 等转换为可点击的链接
 * 点击后跳转到对应文档并高亮相关段落
 */
export const AnswerWithCitations: React.FC<AnswerWithCitationsProps> = ({
  answer,
  citations,
}) => {
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const navigate = useNavigate();

  // 处理引用标号的点击
  const handleCitationClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const citation = citations.find((c) => c.index === index);
    if (!citation) return;

    const highlightParam = citation.snippet
      ? encodeURIComponent(citation.snippet.substring(0, 120))
      : "";

    // PDF 优先按 page 定位；否则按 markdown 方式高亮
    if (citation.doc_id) {
      const params = new URLSearchParams();
      if (highlightParam) params.set("highlight", highlightParam);
      if (citation.page) params.set("page", String(citation.page));
      navigate(
        `/kb/${knowledgeBaseId}/doc/${citation.doc_id}?${params.toString()}`
      );
    }
  };

  // 处理 Markdown 内容，将引用标号转换为可点击的链接格式
  const processAnswer = (text: string): string => {
    // 匹配 [1], [2], [12] 等引用标号
    // 支持多个连续引用，如 [1][2] 或 [1,2]
    const citationPattern = /\[(\d+)(?:,\s*\d+)*\]/g;

    return text.replace(citationPattern, (match) => {
      // 提取所有数字
      const numbers = match
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((n: string) => parseInt(n.trim()))
        .filter((n: number) => citations.some((c) => c.index === n));

      if (numbers.length === 0) return match;

      // 检查第一个引用是否可点击（有 doc_id）
      const firstCitation = citations.find((c) => c.index === numbers[0]);
      const isClickable = Boolean(firstCitation?.doc_id);

      if (isClickable) {
        // 创建 Markdown 链接格式，使用特殊的 href 来标识引用链接
        const citationText =
          numbers.length > 1 ? numbers.join(",") : numbers[0].toString();
        return `[${citationText}](citation:${numbers[0]})`;
      }

      return match;
    });
  };

  const processedAnswer = processAnswer(answer);
  const htmlContent = markdownToHtml(processedAnswer);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理引用链接点击
  useEffect(() => {
    if (!containerRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const citationLink = target.closest(".citation-link");
      if (citationLink) {
        e.preventDefault();
        const citationId = citationLink.getAttribute("data-citation");
        if (citationId) {
          const index = parseInt(citationId);
          handleCitationClick(index, e as any);
        }
      }
    };

    containerRef.current.addEventListener("click", handleClick);
    return () => {
      containerRef.current?.removeEventListener("click", handleClick);
    };
  }, [citations]);

  return (
    <div>
      {/* 引用来源统计 */}
      {/* {citations.length > 0 && (
        <div className="mb-3 text-xs text-gray-500 flex flex-wrap items-center gap-2 pb-2 border-b border-gray-200">
          <span className="font-medium text-gray-600">引用来源：</span>
          {citations.map((c) => (
            <span key={c.index} className="inline-flex items-center gap-1">
              <span className="text-blue-600 font-medium">[{c.index}]</span>
              {c.chunk_position && (
                <span className="text-gray-400">
                  {c.chunk_position}
                  {c.page && `, 第 ${c.page} 页`}
                </span>
              )}
            </span>
          ))}
        </div>
      )} */}
      <div
        ref={containerRef}
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
