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

// 按 Markdown 语法渲染行内链接：
// - [label](https://example.com)
// - <https://example.com>
// - 裸露的 http/https 链接（GFM 允许的自动链接）
function renderMarkdownInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const regex =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|<(https?:\/\/[^>\s]+)>|(\bhttps?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let key = 0;

  text.replace(
    regex,
    (match, label, urlInParen, urlInAngle, bareUrl, offset) => {
      if (offset > lastIndex) {
        nodes.push(
          <span key={`t-${key++}`}>{text.slice(lastIndex, offset)}</span>
        );
      }
      const href =
        (urlInParen as string) || (urlInAngle as string) || (bareUrl as string);
      const labelText = (label as string) || href;
      nodes.push(
        <a
          key={`l-${key++}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="doc-inline-link"
        >
          {labelText}
        </a>
      );
      lastIndex = (offset as number) + match.length;
      return match;
    }
  );

  if (lastIndex < text.length) {
    nodes.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length ? nodes : text;
}

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
    const [textColor, setTextColor] = useState("#0f172a");
    const [highlightColor, setHighlightColor] = useState("#fef08a");
    const [outlineCollapsed, setOutlineCollapsed] = useState(false);

    const blockRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
    const flashTimerRef = useRef<number | null>(null);
    const isFirstRender = useRef(true);

    // 使用 ref 追踪 onChangeBlocks，避免它变化导致 useEffect 重新执行
    const onChangeBlocksRef = useRef(onChangeBlocks);
    useEffect(() => {
      onChangeBlocksRef.current = onChangeBlocks;
    }, [onChangeBlocks]);

    useEffect(() => {
      setOutline(buildOutline(blocks));

      // 跳过首次渲染的回调，避免打开文档即触发自动保存
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (onChangeBlocksRef.current) {
        onChangeBlocksRef.current(blocks);
      }
    }, [blocks]); // 仅依赖 blocks，切断与 onChangeBlocks 的依赖

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

    // 处理粘贴：尝试解析 HTML 保留块级结构
    function handleBlockPaste(id: string, e: React.ClipboardEvent) {
      const html = e.clipboardData.getData("text/html");
      const plainText = e.clipboardData.getData("text/plain");

      // 如果只有纯文本且只有一行，让浏览器默认行为处理（可能更快/更稳）
      // 但为了统一体验，如果是 HTML 我们优先处理
      if (!html && plainText && !plainText.includes("\n")) {
        return;
      }

      e.preventDefault();

      const newBlocks: DocBlock[] = [];

      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        let currentTextBuffer = "";

        const flushBuffer = () => {
          if (currentTextBuffer.trim()) {
            newBlocks.push(createBlock("paragraph", currentTextBuffer));
          }
          currentTextBuffer = "";
        };

        const traverse = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            currentTextBuffer += node.textContent || "";
            return;
          }

          if (node.nodeType !== Node.ELEMENT_NODE) return;

          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const isBlock = [
            "p",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "li",
            "blockquote",
            "div",
            "ul",
            "ol",
          ].includes(tag);

          if (!isBlock) {
            // inline element, append text
            currentTextBuffer += el.innerText;
            return;
          }

          // Container blocks -> recurse
          if (tag === "ul" || tag === "ol" || tag === "div") {
            flushBuffer();
            Array.from(node.childNodes).forEach(traverse);
            flushBuffer();
            return;
          }

          // Leaf blocks
          flushBuffer();

          let type: BlockType = "paragraph";
          const text = el.innerText.trim();

          if (tag === "h1") type = "heading1";
          else if (tag === "h2") type = "heading2";
          else if (["h3", "h4", "h5", "h6"].includes(tag)) type = "heading3";
          else if (tag === "blockquote") type = "quote";
          else if (tag === "li") {
            const pTag = el.parentElement?.tagName.toLowerCase();
            type = pTag === "ol" ? "numbered" : "bulleted";
          }

          if (text) {
            newBlocks.push(createBlock(type, text));
          }
        };

        Array.from(doc.body.childNodes).forEach(traverse);
        flushBuffer();
      }

      // Fallback to plain text splitting if no blocks parsed from HTML
      if (newBlocks.length === 0 && plainText) {
        plainText.split("\n").forEach((line) => {
          if (line.trim())
            newBlocks.push(createBlock("paragraph", line.trim()));
        });
      }

      if (newBlocks.length > 0) {
        setBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;

          const currentBlock = prev[idx];
          const isCurrentEmpty = !currentBlock.text.trim();

          const before = prev.slice(0, idx);
          const after = prev.slice(idx + 1);

          if (isCurrentEmpty) {
            return [...before, ...newBlocks, ...after];
          } else {
            return [...before, currentBlock, ...newBlocks, ...after];
          }
        });

        // Focus last block
        setTimeout(() => {
          const lastId = newBlocks[newBlocks.length - 1].id;
          scrollToBlock(lastId);
          setActiveId(lastId);
          const el = blockRefs.current.get(lastId);
          const inner = el?.querySelector(".doc-block-inner") as HTMLDivElement;
          inner?.focus();
        }, 50);
      }
    }

    function handleBlockFocus(id: string) {
      setActiveId(id);
      const block = blocks.find((b) => b.id === id);
      if (block) {
        setCurrentType(block.type);
      }
    }

    function focusBlock(id: string | null) {
      if (!id) return;
      const el = blockRefs.current.get(id);
      const inner = el?.querySelector(".doc-block-inner") as
        | HTMLDivElement
        | undefined;
      if (inner) inner.focus();
    }

    function insertDividerBelow() {
      if (!activeId) return;
      const divider = createBlock("divider", "");
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === activeId);
        if (idx === -1) return [...prev, divider];
        const next = [...prev];
        next.splice(idx + 1, 0, divider);
        return next;
      });
      setActiveId(divider.id);
      setCurrentType("divider");
      setTimeout(() => {
        scrollToBlock(divider.id);
      }, 0);
    }

    function deleteBlock(targetId: string | null) {
      if (!targetId) return;
      setBlocks((prev) => {
        if (prev.length === 1) {
          const only = prev[0];
          const reset: DocBlock = { ...only, type: "paragraph", text: "" };
          setActiveId(reset.id);
          setTimeout(() => focusBlock(reset.id), 0);
          return [reset];
        }
        const idx = prev.findIndex((b) => b.id === targetId);
        if (idx === -1) return prev;
        const nextBlocks = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        const fallback =
          nextBlocks[idx] ?? nextBlocks[Math.max(0, idx - 1)] ?? null;
        const nextId = fallback?.id ?? null;
        setActiveId(nextId);
        setTimeout(() => focusBlock(nextId), 0);
        return nextBlocks;
      });
    }

    const deleteActiveBlock = () => deleteBlock(activeId);

    function insertBlockBelow(
      currentId: string,
      type: BlockType = "paragraph"
    ) {
      const newBlock = createBlock(type, "");
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === currentId);
        if (idx === -1) return [...prev, newBlock];
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      setActiveId(newBlock.id);
      setCurrentType(type);
      setTimeout(() => focusBlock(newBlock.id), 0);
    }

    function handleKeyDown(
      block: DocBlock,
      e: React.KeyboardEvent<HTMLDivElement>
    ) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        insertBlockBelow(block.id, "paragraph");
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        const text = (e.currentTarget.innerText || "")
          .replace(/\n/g, "")
          .trim();
        const isEmpty = text.length === 0;
        if (isEmpty) {
          e.preventDefault();
          deleteBlock(block.id);
        }
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

    function applyColor(color: string) {
      document.execCommand("foreColor", false, color);
    }

    function applyHighlight(color: string) {
      // hiliteColor 对大多数现代浏览器兼容；作为 fallback 使用 backColor
      const success = document.execCommand("hiliteColor", false, color);
      if (!success) {
        document.execCommand("backColor", false, color);
      }
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

    const rootClassName =
      (className ? `doc-root ${className}` : "doc-root") +
      (outlineCollapsed ? " doc-root--outline-hidden" : "");
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

            <div className="doc-toolbar-group doc-toolbar-group--color">
              <label className="doc-color-label">
                文本色
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    applyColor(e.target.value);
                  }}
                />
              </label>
              <label className="doc-color-label">
                高亮
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => {
                    setHighlightColor(e.target.value);
                    applyHighlight(e.target.value);
                  }}
                />
              </label>
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

            <div className="doc-toolbar-group doc-toolbar-group--outline-toggle">
              <button
                type="button"
                className="doc-btn"
                onClick={() => setOutlineCollapsed((v) => !v)}
              >
                {outlineCollapsed ? "展开大纲" : "隐藏大纲"}
              </button>
              <button
                type="button"
                className="doc-btn"
                onClick={insertDividerBelow}
              >
                分割线
              </button>
              <button
                type="button"
                className="doc-btn"
                onClick={deleteActiveBlock}
              >
                删除块
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
                      onPaste={(e) => handleBlockPaste(block.id, e)}
                      onKeyDown={(e) => handleKeyDown(block, e)}
                    >
                      {renderMarkdownInline(block.text)}
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
                    onClick={() => handleBlockFocus(block.id)}
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
                    onInput={(e) => handleBlockInput(block.id, e)}
                    onFocus={() => handleBlockFocus(block.id)}
                    onPaste={(e) => handleBlockPaste(block.id, e)}
                    onKeyDown={(e) => handleKeyDown(block, e)}
                  >
                    {renderMarkdownInline(block.text)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右侧：大纲 */}
        {!outlineCollapsed && (
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
        )}
      </div>
    );
  }
);

export default FeishuDocEditor;
