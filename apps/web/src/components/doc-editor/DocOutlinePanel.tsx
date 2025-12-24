import React from "react";
import { OutlineItem } from "./docModel";

interface DocOutlinePanelProps {
  outline: OutlineItem[];
  activeId: string | null;
  onItemClick: (item: OutlineItem) => void;
}

const DocOutlinePanel: React.FC<DocOutlinePanelProps> = ({
  outline,
  activeId,
  onItemClick,
}) => {
  return (
    <div className="doc-outline-panel">
      <div className="doc-outline-title">大纲 / 引用</div>
      <div className="doc-outline-subtitle">光标所在块会在这里高亮，点击可定位</div>
      <div className="doc-outline-list">
        {outline.length === 0 ? (
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            暂无标题或引用块，试试添加一个标题或引用块。
          </div>
        ) : (
          outline.map((item) => {
            const active = item.blockId === activeId;
            const indent =
              item.type === "ref" ? 0 : Math.max(0, item.level - 1) * 12;
            const tagText =
              item.type === "ref"
                ? "REF"
                : item.level === 1
                  ? "H1"
                  : item.level === 2
                    ? "H2"
                    : "H3";

            return (
              <div
                key={item.id}
                className={
                  "doc-outline-item" +
                  (active ? " doc-outline-item--active" : "")
                }
                style={{ marginLeft: indent }}
                onClick={() => onItemClick(item)}
              >
                <span className="doc-outline-tag">{tagText}</span>
                <span className="doc-outline-text">{item.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DocOutlinePanel;

