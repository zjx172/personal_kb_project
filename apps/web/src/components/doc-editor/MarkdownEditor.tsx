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

    const previewElement = previewRef.current;

    const clearHighlights = () => {
      const highlights = previewElement.querySelectorAll("mark.highlight-search");
      highlights.forEach((highlight) => {
        const parent = highlight.parentNode;
        if (!parent) return;
        parent.replaceChild(
          document.createTextNode(highlight.textContent || ""),
          highlight
        );
        parent.normalize();
      });
    };

    const trimmedHighlight = highlightText?.trim();
    if (!trimmedHighlight) {
      clearHighlights();
      return;
    }

    const escapeRegex = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const timer = window.setTimeout(() => {
      clearHighlights();

      const walker = document.createTreeWalker(
        previewElement,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
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

      interface TextNodeInfo {
        node: Text;
        text: string;
        startIndex: number;
        endIndex: number;
      }

      const textNodeInfos: TextNodeInfo[] = [];
      let fullText = "";
      let currentNode: Node | null;
      while ((currentNode = walker.nextNode())) {
        if (currentNode.nodeType !== Node.TEXT_NODE) continue;
        const text = currentNode.textContent || "";
        const startIndex = fullText.length;
        const endIndex = startIndex + text.length;
        textNodeInfos.push({
          node: currentNode as Text,
          text,
          startIndex,
          endIndex,
        });
        fullText += text;
      }

      const normalizedSearch = trimmedHighlight.replace(/\u00A0/g, " ");
      const cappedSearch =
        normalizedSearch.length > 2000
          ? normalizedSearch.slice(0, 2000)
          : normalizedSearch;
      const searchTokens = cappedSearch.split(/\s+/).filter(Boolean);
      if (!searchTokens.length) return;

      const pattern = searchTokens
        .map((token) => escapeRegex(token))
        .join("[\\s\\u00A0]+");
      const match = new RegExp(pattern, "i").exec(fullText);
      if (!match) return;

      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      interface HighlightRange {
        nodeInfo: TextNodeInfo;
        highlightStart: number;
        highlightEnd: number;
      }

      const highlightRanges: HighlightRange[] = [];

      for (const nodeInfo of textNodeInfos) {
        const intersectStart = Math.max(nodeInfo.startIndex, matchStart);
        const intersectEnd = Math.min(nodeInfo.endIndex, matchEnd);

        if (intersectStart < intersectEnd) {
          highlightRanges.push({
            nodeInfo,
            highlightStart: intersectStart - nodeInfo.startIndex,
            highlightEnd: intersectEnd - nodeInfo.startIndex,
          });
        }
      }

      for (let i = highlightRanges.length - 1; i >= 0; i--) {
        const { nodeInfo, highlightStart, highlightEnd } = highlightRanges[i];
        const text = nodeInfo.text;
        const beforeText = text.substring(0, highlightStart);
        const matchText = text.substring(highlightStart, highlightEnd);
        const afterText = text.substring(highlightEnd);

        const parent = nodeInfo.node.parentNode;
        if (!parent) continue;

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

        nodesToInsert.forEach((newNode) => {
          parent.insertBefore(newNode, nodeInfo.node);
        });
        parent.removeChild(nodeInfo.node);
      }
    }, 250);

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
