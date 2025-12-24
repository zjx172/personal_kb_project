import React from "react";
import { DocBlock } from "./docModel";
import { renderMarkdownInline } from "./renderMarkdownInline";

interface DocContentProps {
  blocks: DocBlock[];
  activeId: string | null;
  onBlockInput: (id: string, e: React.FormEvent<HTMLDivElement>) => void;
  onBlockFocus: (id: string) => void;
  onBlockPaste: (id: string, e: React.ClipboardEvent) => void;
  onKeyDown: (
    block: DocBlock,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => void;
  onRefTitleChange: (id: string, val: string) => void;
  setBlockRef: (id: string, el: HTMLDivElement | null) => void;
}

function renderBlockContent(
  block: DocBlock,
  isActive: boolean
): React.ReactNode {
  if (!block.text) return React.createElement("br");
  return isActive ? block.text : renderMarkdownInline(block.text);
}

const DocContent: React.FC<DocContentProps> = ({
  blocks,
  activeId,
  onBlockInput,
  onBlockFocus,
  onBlockPaste,
  onKeyDown,
  onRefTitleChange,
  setBlockRef,
}) => {
  return (
    <div className="doc-content">
      {blocks.map((block, index) => {
        const isActive = block.id === activeId;
        const blockClass =
          "doc-block doc-block--" +
          block.type +
          (isActive ? " doc-block--active" : "");
        const renderedContent = renderBlockContent(block, isActive);

        if (block.type === "ref") {
          return (
            <div
              key={block.id}
              className={blockClass}
              ref={(el) => setBlockRef(block.id, el)}
              data-type={block.type}
              data-md-id={block.refId || block.id}
            >
              <div className="doc-ref-title">
                <span className="doc-ref-tag">REF</span>
                <input
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    background: "transparent",
                    flex: 1,
                  }}
                  placeholder="引用标题"
                  value={block.refTitle || ""}
                  onChange={(e) => onRefTitleChange(block.id, e.target.value)}
                  onFocus={() => onBlockFocus(block.id)}
                />
              </div>
              <div
                className="doc-block-inner"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => onBlockInput(block.id, e)}
                onFocus={() => onBlockFocus(block.id)}
                onPaste={(e) => onBlockPaste(block.id, e)}
                onKeyDown={(e) => onKeyDown(block, e)}
              >
                {renderedContent}
              </div>
            </div>
          );
        }

        if (block.type === "divider") {
          return (
            <div
              key={block.id}
              className={blockClass + " doc-block--divider"}
              ref={(el) => setBlockRef(block.id, el)}
              data-type={block.type}
              onClick={() => onBlockFocus(block.id)}
            >
              <div className="doc-divider-line" />
            </div>
          );
        }

        const dataOrder =
          block.type === "numbered" ? String(index + 1) : undefined;

        return (
          <div
            key={block.id}
            className={blockClass}
            ref={(el) => setBlockRef(block.id, el)}
            data-type={block.type}
          >
            <div
              className="doc-block-inner"
              data-order={dataOrder}
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => onBlockInput(block.id, e)}
              onFocus={() => onBlockFocus(block.id)}
              onPaste={(e) => onBlockPaste(block.id, e)}
              onKeyDown={(e) => onKeyDown(block, e)}
            >
              {renderedContent}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocContent;

