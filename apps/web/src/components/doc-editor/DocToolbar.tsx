import React from "react";
import { BlockType } from "./docModel";

interface DocToolbarProps {
  currentType: BlockType;
  textColor: string;
  highlightColor: string;
  outlineCollapsed: boolean;
  onBold: () => void;
  onItalic: () => void;
  onCode: () => void;
  onTextColorChange: (color: string) => void;
  onHighlightChange: (color: string) => void;
  onUpdateType: (type: BlockType) => void;
  onToggleOutline: () => void;
  onInsertDivider: () => void;
  onDeleteActive: () => void;
}

const DocToolbar: React.FC<DocToolbarProps> = ({
  currentType,
  textColor,
  highlightColor,
  outlineCollapsed,
  onBold,
  onItalic,
  onCode,
  onTextColorChange,
  onHighlightChange,
  onUpdateType,
  onToggleOutline,
  onInsertDivider,
  onDeleteActive,
}) => {
  return (
    <div className="doc-toolbar">
      <div className="doc-toolbar-group">
        <button
          type="button"
          className="doc-btn doc-btn--icon"
          onClick={onBold}
        >
          B
        </button>
        <button
          type="button"
          className="doc-btn doc-btn--icon"
          onClick={onItalic}
        >
          I
        </button>
        <button
          type="button"
          className="doc-btn doc-btn--icon"
          onClick={onCode}
        >
          {"</>"}
        </button>
      </div>

      <span className="doc-toolbar-divider" />

      <div className="doc-toolbar-group doc-toolbar-group--color">
        <label className="doc-color-label">
          文本色
          <input
            type="color"
            value={textColor}
            onChange={(e) => onTextColorChange(e.target.value)}
          />
        </label>
        <label className="doc-color-label">
          高亮
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => onHighlightChange(e.target.value)}
          />
        </label>
      </div>

      <span className="doc-toolbar-divider" />

      <div className="doc-toolbar-group">
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "paragraph" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("paragraph")}
        >
          文本
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "heading1" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("heading1")}
        >
          标题 1
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "heading2" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("heading2")}
        >
          标题 2
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "heading3" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("heading3")}
        >
          标题 3
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "quote" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("quote")}
        >
          引用
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "bulleted" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("bulleted")}
        >
          • 列表
        </button>
        <button
          type="button"
          className={
            "doc-btn" + (currentType === "numbered" ? " doc-btn--active" : "")
          }
          onClick={() => onUpdateType("numbered")}
        >
          1. 列表
        </button>
        <button
          type="button"
          className={"doc-btn" + (currentType === "ref" ? " doc-btn--active" : "")}
          onClick={() => onUpdateType("ref")}
        >
          引用块
        </button>
      </div>

      <div className="doc-toolbar-group doc-toolbar-group--outline-toggle">
        <button type="button" className="doc-btn" onClick={onToggleOutline}>
          {outlineCollapsed ? "展开大纲" : "隐藏大纲"}
        </button>
        <button type="button" className="doc-btn" onClick={onInsertDivider}>
          分割线
        </button>
        <button type="button" className="doc-btn" onClick={onDeleteActive}>
          删除块
        </button>
      </div>
    </div>
  );
};

export default DocToolbar;

