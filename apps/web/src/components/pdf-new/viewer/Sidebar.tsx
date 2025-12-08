import React from "react";

import { useHighlights } from "../highlights/useHighlights";

export const Sidebar = () => {
  const { highlights, deleteHighlight, scrollToHighlight } = useHighlights();

  return (
    <div className="w-72 border-l bg-white px-4 py-3 overflow-y-auto">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">
        高亮 <span className="text-gray-500">({highlights.length})</span>
      </h3>

      {highlights.length === 0 && (
        <div className="text-xs text-gray-400">暂无高亮</div>
      )}

      <div className="space-y-3">
        {highlights.map((highlight) => (
          <button
            key={highlight.id}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            onClick={() => scrollToHighlight(highlight.id)}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>
                第 {highlight.pageNumber} 页 ·{" "}
                {new Date(highlight.createdAt).toLocaleTimeString()}
              </span>
              <span
                className="cursor-pointer px-1 text-red-500 hover:text-red-600"
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteHighlight(highlight.id);
                }}
              >
                删
              </span>
            </div>
            <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {highlight.quoteText}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
