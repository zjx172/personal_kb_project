import React from "react";
import { Card } from "@arco-design/web-react";
import { useNavigate } from "react-router-dom";
import { Citation } from "../api";

interface SearchResultCardProps {
  citation: Citation;
  index: number;
}

/**
 * 搜索结果卡片组件，类似 Google 搜索结果
 */
export const SearchResultCard: React.FC<SearchResultCardProps> = ({
  citation,
  index,
}) => {
  const navigate = useNavigate();

  // 检查是否是 Markdown 文档
  const isMarkdownDoc = citation.source.startsWith("markdown_doc:");
  const docId = isMarkdownDoc
    ? citation.source.replace("markdown_doc:", "")
    : null;

  const handleCardClick = () => {
    if (docId && citation.snippet) {
      // 跳转到文档页面，并传递高亮信息
      const highlightParam = encodeURIComponent(
        citation.snippet.substring(0, 100)
      );
      navigate(`/doc/${docId}?highlight=${highlightParam}`);
    } else if (docId) {
      navigate(`/doc/${docId}`);
    }
  };

  // 格式化来源显示
  const formatSource = (source: string) => {
    if (isMarkdownDoc) {
      return citation.title || "知识库文档";
    }
    // 如果是文件路径，只显示文件名
    const parts = source.split("/");
    return parts[parts.length - 1] || source;
  };

  return (
    <div
      className={`mb-4 pb-4 border-b border-gray-200 last:border-b-0 transition-all ${
        docId ? "cursor-pointer hover:bg-gray-50 px-2 -mx-2 py-2 rounded" : ""
      }`}
      onClick={docId ? handleCardClick : undefined}
    >
      <div className="flex flex-col">
        {/* 标题 */}
        {citation.title && (
          <div className="mb-1">
            <h3
              className={`text-xl font-normal text-blue-600 leading-snug ${
                docId ? "hover:underline" : ""
              }`}
              style={{ fontFamily: "arial, sans-serif" }}
            >
              {citation.title}
            </h3>
          </div>
        )}

        {/* 来源和 URL */}
        <div className="mb-1 flex items-center gap-2 text-sm">
          <span className="text-green-700 font-normal">
            {formatSource(citation.source)}
          </span>
          {isMarkdownDoc && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">知识库文档</span>
            </>
          )}
        </div>

        {/* 摘要内容 */}
        <div className="text-sm text-gray-700 leading-relaxed mt-1">
          <span className="line-clamp-2">{citation.snippet}</span>
          {citation.snippet.length > 150 && (
            <span className="text-gray-500">...</span>
          )}
        </div>
      </div>
    </div>
  );
};
