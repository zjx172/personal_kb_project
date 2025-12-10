import React, { forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import MarkdownEditorWithRefs, {
  type MarkdownEditorWithRefsHandle,
} from "../react-markdown-editor-v2/MarkdownEditorWithRefs";

interface MarkdownEditorProps {
  content: string;
  viewMode?: "edit" | "preview" | "both";
  highlightText?: string | null;
  onContentChange: (content: string) => void;
}

export interface MarkdownEditorRef {
  editorRef: React.RefObject<MarkdownEditorWithRefsHandle>;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ content, viewMode = "both", highlightText, onContentChange }, ref) => {
    const innerRef = useRef<MarkdownEditorWithRefsHandle | null>(null);

    useImperativeHandle(ref, () => ({
      editorRef: innerRef,
    }));

    useEffect(() => {
      if (!innerRef.current) return;
      innerRef.current.setValue(content);
    }, [content]);

    return (
      <MarkdownEditorWithRefs
        ref={innerRef}
        value={content}
        highlightText={highlightText}
        viewMode={viewMode}
        onChange={onContentChange}
        className="md-editor-card"
      />
    );
  }
);

MarkdownEditor.displayName = "MarkdownEditor";
