import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import "./doc-editor.css";
import DocContent from "./DocContent";
import DocOutlinePanel from "./DocOutlinePanel";
import DocToolbar from "./DocToolbar";
import {
  BlockType,
  DocBlock,
  OutlineItem,
  blocksToMarkdown,
  buildOutline,
  createBlock,
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
      const inner = e.target as HTMLDivElement;
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode;
      const anchorOffset = selection?.anchorOffset ?? null;
      const shouldRestoreCaret =
        !!anchorNode && anchorOffset != null && inner.contains(anchorNode);

      const text = inner.innerText.replace(/\n$/, "");
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));

      if (shouldRestoreCaret) {
        setTimeout(() => {
          const el = blockRefs.current.get(id);
          const innerEl = el?.querySelector(".doc-block-inner");
          if (!innerEl) return;
          const textNode =
            innerEl.firstChild && innerEl.firstChild.nodeType === 3
              ? innerEl.firstChild
              : null;
          if (!textNode) return;
          const offset = Math.min(
            anchorOffset as number,
            (textNode.textContent || "").length
          );
          const sel = window.getSelection();
          if (!sel) return;
          const range = document.createRange();
          range.setStart(textNode, offset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }, 0);
      }
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

      let nextId: string | null = null;

      setBlocks((prev) => {
        if (prev.length === 1) {
          const only = prev[0];
          const reset: DocBlock = { ...only, type: "paragraph", text: "" };
          nextId = reset.id;
          return [reset];
        }

        const idx = prev.findIndex((b) => b.id === targetId);
        if (idx === -1) return prev;

        const nextBlocks = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
        const fallback =
          nextBlocks[idx] ?? nextBlocks[Math.max(0, idx - 1)] ?? null;
        nextId = fallback?.id ?? null;
        return nextBlocks;
      });

      setActiveId(nextId);
      setTimeout(() => focusBlock(nextId), 0);
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
        const text = (e.currentTarget.innerText || "").replace(/\n/g, "");
        // 仅在当前内容已为空时删除块，避免删除最后一个字符时直接跳块
        const isEmpty = text.trim().length === 0;
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

    const handleTextColorChange = (color: string) => {
      setTextColor(color);
      applyColor(color);
    };

    const handleHighlightChange = (color: string) => {
      setHighlightColor(color);
      applyHighlight(color);
    };

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

          <DocToolbar
            currentType={currentType}
            textColor={textColor}
            highlightColor={highlightColor}
            outlineCollapsed={outlineCollapsed}
            onBold={() => applyInline("bold")}
            onItalic={() => applyInline("italic")}
            onCode={() => applyInline("code")}
            onTextColorChange={handleTextColorChange}
            onHighlightChange={handleHighlightChange}
            onUpdateType={updateBlockType}
            onToggleOutline={() => setOutlineCollapsed((v) => !v)}
            onInsertDivider={insertDividerBelow}
            onDeleteActive={deleteActiveBlock}
          />

          <DocContent
            blocks={blocks}
            activeId={activeId}
            onBlockInput={handleBlockInput}
            onBlockFocus={handleBlockFocus}
            onBlockPaste={handleBlockPaste}
            onKeyDown={handleKeyDown}
            onRefTitleChange={handleRefTitleChange}
            setBlockRef={setBlockRef}
          />
        </div>

        {/* 右侧：大纲 */}
        {!outlineCollapsed && (
          <DocOutlinePanel
            outline={outline}
            activeId={activeId}
            onItemClick={handleOutlineClick}
          />
        )}
      </div>
    );
  }
);

export default FeishuDocEditor;
