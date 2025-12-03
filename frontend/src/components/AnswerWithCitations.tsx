import React from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { Citation } from "../api";

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
  const navigate = useNavigate();

  // 处理引用标号的点击
  const handleCitationClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const citation = citations.find((c) => c.index === index);
    if (!citation) return;

    // 检查是否是 Markdown 文档
    const isMarkdownDoc = citation.source.startsWith("markdown_doc:");
    if (isMarkdownDoc && citation.doc_id) {
      // 跳转到文档页面，并传递高亮信息
      const highlightParam = citation.snippet
        ? encodeURIComponent(citation.snippet.substring(0, 100))
        : "";
      navigate(`/doc/${citation.doc_id}?highlight=${highlightParam}`);
    }
  };

  // 处理 Markdown 内容，将引用标号转换为 Markdown 链接格式
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

      // 检查第一个引用是否是 Markdown 文档
      const firstCitation = citations.find((c) => c.index === numbers[0]);
      const isClickable =
        firstCitation?.source.startsWith("markdown_doc:") &&
        firstCitation?.doc_id;

      if (isClickable) {
        // 创建 Markdown 链接格式，使用特殊的 href 来标识引用链接
        const citationText =
          numbers.length > 1 ? `[${numbers.join(",")}]` : `[${numbers[0]}]`;
        return `[${citationText}](citation:${numbers[0]})`;
      }

      return match;
    });
  };

  // 自定义 ReactMarkdown 组件，处理链接点击
  const components = {
    a: ({ node, href, children, ...props }: any) => {
      // 检查是否是引用链接（格式：citation:1）
      if (href && href.startsWith("citation:")) {
        const index = parseInt(href.replace("citation:", ""));
        return (
          <a
            href="#"
            onClick={(e) => handleCitationClick(index, e)}
            className="text-blue-500 underline cursor-pointer hover:text-blue-700"
            {...props}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };

  const processedAnswer = processAnswer(answer);

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown components={components}>{processedAnswer}</ReactMarkdown>
    </div>
  );
};
