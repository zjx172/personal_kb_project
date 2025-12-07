/**
 * Markdown 格式化工具函数
 */

export interface FormatUtils {
  insertText: (before: string, after?: string, wrapSelected?: boolean) => void;
  insertTextAtPosition: (start: number, end: number, text: string) => void;
  getCurrentLineInfo: (cursorPos: number) => {
    lineStart: number;
    lineEnd: number;
    currentLine: string;
  };
  insertAtLineStartOrCursor: (
    marker: string,
    cursorPos: number,
    togglePattern?: RegExp,
    removePattern?: RegExp
  ) => void;
}

export const createFormatUtils = (
  editorRef: React.RefObject<HTMLTextAreaElement>,
  content: string,
  onContentChange: (content: string) => void
): FormatUtils => {
  const insertText = (
    before: string,
    after: string = "",
    wrapSelected: boolean = true
  ) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText && wrapSelected) {
      // 如果有选中文字，用格式包裹选中文字
      newText =
        content.substring(0, start) +
        before +
        selectedText +
        after +
        content.substring(end);
      // 光标放在格式标记之后
      newCursorPos = start + before.length + selectedText.length + after.length;
    } else {
      // 如果没有选中文字，插入格式标记，光标在中间
      newText =
        content.substring(0, start) + before + after + content.substring(end);
      newCursorPos = start + before.length;
    }

    onContentChange(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertTextAtPosition = (start: number, end: number, text: string) => {
    if (!editorRef.current) return;
    const newText = content.substring(0, start) + text + content.substring(end);
    onContentChange(newText);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newPos = start + text.length;
        editorRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const getCurrentLineInfo = (cursorPos: number) => {
    let lineStart = cursorPos;
    while (lineStart > 0 && content[lineStart - 1] !== "\n") {
      lineStart--;
    }

    let lineEnd = cursorPos;
    while (lineEnd < content.length && content[lineEnd] !== "\n") {
      lineEnd++;
    }

    const currentLine = content.substring(lineStart, lineEnd);
    return { lineStart, lineEnd, currentLine };
  };

  const insertAtLineStartOrCursor = (
    marker: string,
    cursorPos: number,
    togglePattern?: RegExp,
    removePattern?: RegExp
  ) => {
    const { lineStart, lineEnd, currentLine } = getCurrentLineInfo(cursorPos);

    if (currentLine.trim().length > 0) {
      // 如果行有内容，检查是否已经有标记（用于切换功能）
      if (togglePattern && togglePattern.test(currentLine.trim())) {
        // 移除标记
        const unmarkedLine = currentLine.replace(
          removePattern || togglePattern,
          ""
        );
        insertTextAtPosition(lineStart, lineEnd, unmarkedLine);
        setTimeout(() => {
          if (editorRef.current) {
            const newPos = lineStart + unmarkedLine.length;
            editorRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      } else {
        // 在行首插入标记
        insertTextAtPosition(lineStart, lineStart, marker);
        setTimeout(() => {
          if (editorRef.current) {
            const offsetFromLineStart = cursorPos - lineStart;
            const newPos = lineStart + marker.length + offsetFromLineStart;
            editorRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    } else {
      // 如果行没有内容，在光标位置插入
      insertText(marker, "");
    }
  };

  return {
    insertText,
    insertTextAtPosition,
    getCurrentLineInfo,
    insertAtLineStartOrCursor,
  };
};

export const handleFormat = (
  type: string,
  formatUtils: FormatUtils,
  editorRef: React.RefObject<HTMLTextAreaElement>,
  content: string
) => {
  if (!editorRef.current) return;

  const textarea = editorRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = content.substring(start, end);

  switch (type) {
    case "bold":
      if (selectedText) {
        if (selectedText.startsWith("**") && selectedText.endsWith("**")) {
          const unformatted = selectedText.slice(2, -2);
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          formatUtils.insertText("**", "**");
        }
      } else {
        formatUtils.insertText("**", "**");
      }
      break;
    case "italic":
      if (selectedText) {
        if (
          (selectedText.startsWith("*") &&
            selectedText.endsWith("*") &&
            !selectedText.startsWith("**")) ||
          (selectedText.startsWith("_") && selectedText.endsWith("_"))
        ) {
          const unformatted = selectedText.replace(/^[*_]|[*_]$/g, "");
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          formatUtils.insertText("*", "*");
        }
      } else {
        formatUtils.insertText("*", "*");
      }
      break;
    case "strikethrough":
      if (selectedText) {
        if (selectedText.startsWith("~~") && selectedText.endsWith("~~")) {
          const unformatted = selectedText.slice(2, -2);
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          formatUtils.insertText("~~", "~~");
        }
      } else {
        formatUtils.insertText("~~", "~~");
      }
      break;
    case "code":
      if (selectedText) {
        if (selectedText.startsWith("`") && selectedText.endsWith("`")) {
          const unformatted = selectedText.slice(1, -1);
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          formatUtils.insertText("`", "`");
        }
      } else {
        formatUtils.insertText("`", "`");
      }
      break;
    case "highlight":
      if (selectedText) {
        if (selectedText.startsWith("==") && selectedText.endsWith("==")) {
          const unformatted = selectedText.slice(2, -2);
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          formatUtils.insertText("==", "==");
        }
      } else {
        formatUtils.insertText("==", "==");
      }
      break;
    case "codeBlock":
      formatUtils.insertText("```\n", "\n```", false);
      break;
    case "quote":
      if (selectedText) {
        const lines = selectedText.split("\n");
        const quotedLines = lines.map((line) => `> ${line}`).join("\n");
        formatUtils.insertTextAtPosition(start, end, quotedLines);
      } else {
        const cursorPos = textarea.selectionStart;
        formatUtils.insertAtLineStartOrCursor(
          "> ",
          cursorPos,
          /^>\s*/,
          /^>\s*/
        );
      }
      break;
    case "heading":
      if (selectedText) {
        if (selectedText.match(/^#{1,6} /)) {
          const unformatted = selectedText.replace(/^#{1,6} /, "");
          formatUtils.insertTextAtPosition(start, end, unformatted);
        } else {
          const lines = selectedText.split("\n");
          const headingLines = lines
            .map((line) => `# ${line.trim()}`)
            .join("\n");
          formatUtils.insertTextAtPosition(start, end, headingLines);
        }
      } else {
        const cursorPos = textarea.selectionStart;
        formatUtils.insertAtLineStartOrCursor(
          "# ",
          cursorPos,
          /^#{1,6}\s*/,
          /^#{1,6}\s*/
        );
      }
      break;
    case "ul":
      if (selectedText) {
        const lines = selectedText.split("\n");
        const listLines = lines
          .map((line) => {
            if (line.trim()) {
              const trimmed = line.trim().replace(/^[-*+]\s+/, "");
              return `- ${trimmed}`;
            }
            return line;
          })
          .join("\n");
        formatUtils.insertTextAtPosition(start, end, listLines);
      } else {
        const cursorPos = textarea.selectionStart;
        formatUtils.insertAtLineStartOrCursor(
          "- ",
          cursorPos,
          /^[-*+]\s+/,
          /^[-*+]\s+/
        );
      }
      break;
    case "ol":
      if (selectedText) {
        const lines = selectedText.split("\n");
        let counter = 1;
        const listLines = lines
          .map((line) => {
            if (line.trim()) {
              const trimmed = line.trim().replace(/^\d+\.\s+/, "");
              return `${counter++}. ${trimmed}`;
            }
            return line;
          })
          .join("\n");
        formatUtils.insertTextAtPosition(start, end, listLines);
      } else {
        const cursorPos = textarea.selectionStart;
        formatUtils.insertAtLineStartOrCursor(
          "1. ",
          cursorPos,
          /^\d+\.\s+/,
          /^\d+\.\s+/
        );
      }
      break;
    case "link":
      if (selectedText) {
        formatUtils.insertText("[", "]()");
        setTimeout(() => {
          if (editorRef.current) {
            const pos = editorRef.current.selectionStart - 1;
            editorRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
      } else {
        formatUtils.insertText("[", "]()");
        setTimeout(() => {
          if (editorRef.current) {
            const pos = editorRef.current.selectionStart - 1;
            editorRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
      }
      break;
    default:
      break;
  }
};
