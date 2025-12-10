import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./doc-editor.css";
import {
  DocBlock,
  BlockType,
  OutlineItem,
  createBlock,
  buildOutline,
  blocksToMarkdown,
  generateId,
} from "./docModel";

export interface FeishuDocEditorProps {
  initialBlocks?: DocBlock[];
  onChangeBlocks?: (blocks: DocBlock[]) => void;
  /**
   * 自定义标题，默认展示示例标题；传空字符串可隐藏
   */
  title?: string;
  /**
   * 允许外层注入类名，方便在宿主页面控制高度/间距
   */
  className?: string;
  /**
   * 是否显示内置标题
   */
  showHeader?: boolean;
}

export interface FeishuDocEditorHandle {
  getBlocks: () => DocBlock[];
  setBlocks: (blocks: DocBlock[]) => void;
  exportMarkdown: () => string;
  scrollToBlock: (id: string) => void;
}

type InlineCommand = "bold" | "italic" | "code";

const DEFAULT_DOC: DocBlock[] = [
  {
    id: generateId(),
    type: "heading1",
    text: "示例文档标题",
  },
  {
    id: generateId(),
    type: "paragraph",
    text: "这是一个简化版「飞书文档风格」的块级编辑器示例。",
  },
  {
    id: generateId(),
    type: "heading2",
    text: "一、介绍",
  },
  {
    id: generateId(),
    type: "paragraph",
    text: "每一行是一个 Block，支持切换为标题、列表、引用、引用块。",
  },
  {
    id: generateId(),
    type: "ref",
    text: "这里是一段引用块内容，可以在大纲中定位。",
    refId: "problem-1",
    refTitle: "重点问题 1",
  },
  {
    id: generateId(),
    type: "heading2",
    text: "二、更多内容",
  },
  {
    id: generateId(),
    type: "paragraph",
    text: "你可以扩展更多 Block 类型，比如待办列表、表格等等。",
  },
];

const FeishuDocEditor = forwardRef<FeishuDocEditorHandle, FeishuDocEditorProps>(
  (
    { initialBlocks, onChangeBlocks, title, className, showHeader = true },
    ref
  ) => {
    const [blocks, setBlocks] = useState<DocBlock[]>(
      () => initialBlocks ?? DEFAULT_DOC
    );
    const [activeId, setActiveId] = useState<string | null>(
      blocks[0]?.id ?? null
    );
    const [outline, setOutline] = useState<OutlineItem[]>(() =>
      buildOutline(blocks)
    );
    const [currentType, setCurrentType] = useState<BlockType>(
      blocks[0]?.type ?? "paragraph"
    );

    const blockRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const flashTimerRef = useRef<number | null>(null);

    useEffect(() => {
      setOutline(buildOutline(blocks));
      if (onChangeBlocks) {
        onChangeBlocks(blocks);
      }
    }, [blocks, onChangeBlocks]);

    useEffect(() => {
      return () => {
        if (flashTimerRef.current != null) {
          window.clearTimeout(flashTimerRef.current);
        }
      };
    }, []);

    function setBlockRef(id: string, el: HTMLDivElement | null) {
      blockRefs.current.set(id, el);
    }

    function clearFlash() {
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
      }
      blockRefs.current.forEach((el) => {
        if (el) el.classList.remove("doc-flash-highlight");
      });
    }

    function scrollToBlock(id: string) {
      const el = blockRefs.current.get(id);
      if (!el) return;
      clearFlash();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      void el.offsetWidth;
      el.classList.add("doc-flash-highlight");
      flashTimerRef.current = window.setTimeout(() => {
        clearFlash();
      }, 1000);
    }

    function handleBlockInput(id: string, e: React.FormEvent<HTMLDivElement>) {
      const text = (e.target as HTMLDivElement).innerText.replace(/\n$/, "");
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
    }

    function handleBlockFocus(id: string) {
      setActiveId(id);
      const block = blocks.find((b) => b.id === id);
      if (block) {
        setCurrentType(block.type);
      }
    }

    function applyInline(cmd: InlineCommand) {
      // 简化版：利用原生 execCommand，对 contentEditable 直接操作
      if (cmd === "bold") document.execCommand("bold");
      else if (cmd === "italic") document.execCommand("italic");
      else if (cmd === "code") {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const span = document.createElement("code");
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      }
    }

    function updateBlockType(nextType: BlockType) {
      if (!activeId) return;
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === activeId
            ? {
                ...b,
                type: b.type === nextType ? "paragraph" : nextType,
              }
            : b
        )
      );
      const block = blocks.find((b) => b.id === activeId);
      const newType = block && block.type === nextType ? "paragraph" : nextType;
      setCurrentType(newType as BlockType);
    }

    function handleOutlineClick(item: OutlineItem) {
      setActiveId(item.blockId);
      scrollToBlock(item.blockId);
    }

    function handleRefTitleChange(id: string, val: string) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, refTitle: val } : b))
      );
    }

    useImperativeHandle(
      ref,
      () => ({
        getBlocks: () => blocks,
        setBlocks: (next: DocBlock[]) => setBlocks(next),
        exportMarkdown: () => blocksToMarkdown(blocks),
        scrollToBlock,
      }),
      [blocks]
    );

    const rootClassName = className ? `doc-root ${className}` : "doc-root";
    const resolvedTitle = title ?? "Feishu-like Doc Editor（简化版）";

    return (
      <div className={rootClassName}>
        {/* 左侧：文档 */}
        <div className="doc-editor-panel">
          {showHeader && !!resolvedTitle && (
            <div className="doc-title">{resolvedTitle}</div>
          )}

          {/* 工具栏 */}
          <div className="doc-toolbar">
            <div className="doc-toolbar-group">
              <button
                type="button"
                className="doc-btn doc-btn--icon"
                onClick={() => applyInline("bold")}
              >
                B
              </button>
              <button
                type="button"
                className="doc-btn doc-btn--icon"
                onClick={() => applyInline("italic")}
              >
                I
              </button>
              <button
                type="button"
                className="doc-btn doc-btn--icon"
                onClick={() => applyInline("code")}
              >
                {"</>"}
              </button>
            </div>

            <span className="doc-toolbar-divider" />

            <div className="doc-toolbar-group">
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "paragraph" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("paragraph")}
              >
                文本
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "heading1" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("heading1")}
              >
                标题 1
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "heading2" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("heading2")}
              >
                标题 2
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "heading3" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("heading3")}
              >
                标题 3
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "quote" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("quote")}
              >
                引用
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "bulleted" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("bulleted")}
              >
                • 列表
              </button>
              <button
                type="button"
                className={
                  "doc-btn" +
                  (currentType === "numbered" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("numbered")}
              >
                1. 列表
              </button>
              <button
                type="button"
                className={
                  "doc-btn" + (currentType === "ref" ? " doc-btn--active" : "")
                }
                onClick={() => updateBlockType("ref")}
              >
                引用块
              </button>
            </div>
          </div>

          {/* 文档内容 */}
          <div className="doc-content">
            {blocks.map((block, index) => {
              const isActive = block.id === activeId;
              const blockClass =
                "doc-block doc-block--" +
                block.type +
                (isActive ? " doc-block--active" : "");

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
                        onChange={(e) =>
                          handleRefTitleChange(block.id, e.target.value)
                        }
                        onFocus={() => handleBlockFocus(block.id)}
                      />
                    </div>
                    <div
                      className="doc-block-inner"
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleBlockInput(block.id, e)}
                      onFocus={() => handleBlockFocus(block.id)}
                    >
                      {block.text}
                    </div>
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
                    onInput={(e) => handleBlockInput(block.id, e)}
                    onFocus={() => handleBlockFocus(block.id)}
                  >
                    {block.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：大纲 */}
        <div className="doc-outline-panel">
          <div className="doc-outline-title">大纲 / 引用</div>
          <div className="doc-outline-subtitle">
            光标所在块会在这里高亮，点击可定位
          </div>
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
                    onClick={() => handleOutlineClick(item)}
                  >
                    <span className="doc-outline-tag">{tagText}</span>
                    <span className="doc-outline-text">{item.text}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default FeishuDocEditor;
