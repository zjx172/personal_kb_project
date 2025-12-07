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
    if (!highlightText) return;

    const timer = setTimeout(() => {
      const searchText = highlightText.substring(0, 100).trim();
      if (!searchText) return;

      // 在预览区域高亮
      if (previewRef.current) {
        const previewContent = previewRef.current.textContent || "";
        const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedText, "gi");

        if (regex.test(previewContent)) {
          // 查找并高亮所有匹配的文本节点
          const walker = document.createTreeWalker(
            previewRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );

          const textNodes: Text[] = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent && regex.test(node.textContent)) {
              textNodes.push(node as Text);
            }
          }

          // 高亮第一个匹配项
          if (textNodes.length > 0) {
            const firstNode = textNodes[0];
            const range = document.createRange();
            const startIndex = firstNode
              .textContent!.toLowerCase()
              .indexOf(searchText.toLowerCase());
            range.setStart(firstNode, startIndex);
            range.setEnd(firstNode, startIndex + searchText.length);

            const mark = document.createElement("mark");
            mark.style.backgroundColor = "#ffeb3b";
            mark.style.padding = "2px 4px";
            mark.style.borderRadius = "2px";
            mark.style.fontWeight = "500";
            try {
              range.surroundContents(mark);
              mark.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            } catch (e) {
              // 如果 surroundContents 失败，尝试在编辑器中定位
              if (editorRef.current) {
                const editorContent = editorRef.current.value;
                const index = editorContent
                  .toLowerCase()
                  .indexOf(searchText.toLowerCase());
                if (index !== -1) {
                  editorRef.current.setSelectionRange(
                    index,
                    index + searchText.length
                  );
                  editorRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }
            }
          }
        }
      } else if (editorRef.current) {
        // 如果在预览中找不到，尝试在编辑器中定位
        const editorContent = editorRef.current.value;
        const index = editorContent
          .toLowerCase()
          .indexOf(searchText.toLowerCase());
        if (index !== -1) {
          editorRef.current.setSelectionRange(index, index + searchText.length);
          editorRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [highlightText]);

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
