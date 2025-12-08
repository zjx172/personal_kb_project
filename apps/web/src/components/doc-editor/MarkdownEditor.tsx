import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { markdownToHtml } from "../../utils/markdown";

interface MarkdownEditorProps {
  content: string;
  viewMode: "edit" | "preview" | "both";
  highlightText?: string | null;
  onContentChange: (content: string) => void;
}

export interface MarkdownEditorRef {
  editorRef: React.RefObject<HTMLTextAreaElement>;
}

export const MarkdownEditor = forwardRef<
  MarkdownEditorRef,
  MarkdownEditorProps
>(({ content, viewMode, highlightText, onContentChange }, ref) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    editorRef,
  }));

  // 处理高亮文本
  useEffect(() => {
    if (!previewRef.current) return;

    // 清除之前的高亮
    const clearHighlights = () => {
      const highlights = previewRef.current?.querySelectorAll(
        "mark.highlight-search"
      );
      highlights?.forEach((highlight) => {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(
            document.createTextNode(highlight.textContent || ""),
            highlight
          );
          parent.normalize();
        }
      });
    };

    if (!highlightText) {
      clearHighlights();
      return;
    }

    const timer = setTimeout(() => {
      const searchText = highlightText.substring(0, 100).trim();
      if (!searchText || !previewRef.current) return;

      // 先清除之前的高亮
      clearHighlights();

      // 递归查找所有文本节点
      const walker = document.createTreeWalker(
        previewRef.current,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // 跳过代码块、代码行、链接等特殊元素内的文本
            let parent = node.parentElement;
            while (parent) {
              if (
                parent.tagName === "CODE" ||
                parent.tagName === "PRE" ||
                parent.tagName === "A" ||
                parent.classList.contains("citation-link")
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              parent = parent.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      // 收集所有文本节点及其位置信息
      interface TextNodeInfo {
        node: Text;
        text: string;
        startIndex: number;
        endIndex: number;
      }

      const textNodeInfos: TextNodeInfo[] = [];
      let fullText = "";
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || "";
          const startIndex = fullText.length;
          const endIndex = startIndex + text.length;
          textNodeInfos.push({
            node: node as Text,
            text,
            startIndex,
            endIndex,
          });
          fullText += text;
        }
      }

      // 在全文中查找匹配的位置（大小写不敏感）
      const searchLower = searchText.toLowerCase();
      const fullTextLower = fullText.toLowerCase();
      const matchIndex = fullTextLower.indexOf(searchLower);

      if (matchIndex === -1) return;

      // 使用原始文本确定实际匹配的长度（考虑大小写）
      // 从全文中提取实际匹配的文本段
      const actualMatchText = fullText.substring(
        matchIndex,
        matchIndex + searchText.length
      );
      const matchEndIndex = matchIndex + actualMatchText.length;

      // 找到所有需要高亮的文本节点及其高亮范围
      interface HighlightRange {
        nodeInfo: TextNodeInfo;
        highlightStart: number; // 在该节点中的相对位置
        highlightEnd: number; // 在该节点中的相对位置
      }

      const highlightRanges: HighlightRange[] = [];

      for (const nodeInfo of textNodeInfos) {
        // 检查这个节点是否与匹配范围有交集
        const nodeStart = nodeInfo.startIndex;
        const nodeEnd = nodeInfo.endIndex;

        // 计算交集范围
        const intersectStart = Math.max(nodeStart, matchIndex);
        const intersectEnd = Math.min(nodeEnd, matchEndIndex);

        if (intersectStart < intersectEnd) {
          // 计算在这个节点中需要高亮的范围（相对位置）
          const highlightStart = intersectStart - nodeStart;
          const highlightEnd = intersectEnd - nodeStart;

          highlightRanges.push({
            nodeInfo,
            highlightStart,
            highlightEnd,
          });
        }
      }

      // 从后往前处理，避免索引变化影响
      // 依次高亮每个节点中的匹配部分
      for (let i = highlightRanges.length - 1; i >= 0; i--) {
        const { nodeInfo, highlightStart, highlightEnd } = highlightRanges[i];
        const text = nodeInfo.text;

        // 只高亮匹配的部分
        const beforeText = text.substring(0, highlightStart);
        const matchText = text.substring(highlightStart, highlightEnd);
        const afterText = text.substring(highlightEnd);

        const parent = nodeInfo.node.parentNode;
        if (!parent) continue;

        // 创建新的节点
        const nodesToInsert: Node[] = [];

        if (afterText) {
          nodesToInsert.push(document.createTextNode(afterText));
        }

        const highlightNode = document.createElement("mark");
        highlightNode.className = "highlight-search bg-yellow-200 px-1 rounded";
        highlightNode.textContent = matchText;
        nodesToInsert.push(highlightNode);

        if (beforeText) {
          nodesToInsert.push(document.createTextNode(beforeText));
        }

        // 替换原文本节点
        nodesToInsert.forEach((newNode) => {
          parent.insertBefore(newNode, nodeInfo.node);
        });
        parent.removeChild(nodeInfo.node);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      clearHighlights();
    };
  }, [highlightText, content]);

  return (
    <>
      {(viewMode === "edit" || viewMode === "both") && (
        <div
          className={`${
            viewMode === "both" ? "w-1/2" : "w-full"
          } flex flex-col border-r bg-background`}
        >
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="flex-1 w-full p-6 resize-none outline-none text-sm leading-relaxed bg-background font-mono"
            placeholder="开始输入...支持 Markdown 语法"
            style={{
              fontSize: "14px",
              lineHeight: "1.75",
            }}
          />
        </div>
      )}
      {(viewMode === "preview" || viewMode === "both") && (
        <div
          ref={previewRef}
          className={`${
            viewMode === "both" ? "w-1/2" : "w-full"
          } overflow-y-auto p-6 bg-background`}
          style={{
            maxWidth: viewMode === "both" ? "100%" : "900px",
            margin: viewMode === "both" ? "0" : "0 auto",
          }}
        >
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(content || "*暂无内容*"),
            }}
          />
        </div>
      )}
    </>
  );
});

MarkdownEditor.displayName = "MarkdownEditor";
