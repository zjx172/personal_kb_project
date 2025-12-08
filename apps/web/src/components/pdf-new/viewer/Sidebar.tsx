import React from "react";

import { useHighlights } from "../highlights/useHighlights";

export const Sidebar = () => {
  const { highlights, deleteHighlight, scrollToHighlight } = useHighlights();

  return (
    <div
      style={{
        width: 280,
        borderLeft: "1px solid #eee",
        padding: "8px 12px",
        overflowY: "auto",
      }}
    >
      <h3 style={{ fontSize: 14, margin: "8px 0" }}>
        高亮 ({highlights.length})
      </h3>

      {highlights.length === 0 && (
        <div style={{ fontSize: 12, color: "#999" }}>暂无高亮</div>
      )}

      {highlights.map((highlight) => (
        <div
          key={highlight.id}
          style={{
            padding: "6px 8px",
            marginBottom: 8,
            borderRadius: 6,
            background: "#fafafa",
            cursor: "pointer",
          }}
          onClick={() => scrollToHighlight(highlight.id)}
        >
          <div
            style={{
              fontSize: 12,
              marginBottom: 4,
              color: "#555",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              第 {highlight.pageNumber} 页 ·{" "}
              {new Date(highlight.createdAt).toLocaleTimeString()}
            </span>
            <button
              style={{
                fontSize: 11,
                color: "#c00",
                border: "none",
                background: "transparent",
              }}
              onClick={(event) => {
                event.stopPropagation();
                void deleteHighlight(highlight.id);
              }}
            >
              删
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#333", whiteSpace: "pre-wrap" }}>
            {highlight.quoteText}
          </div>
        </div>
      ))}
    </div>
  );
};
