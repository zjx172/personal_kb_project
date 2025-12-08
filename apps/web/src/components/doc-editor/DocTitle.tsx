import React from "react";
import { MarkdownDocDetail } from "../../api";

interface DocTitleProps {
  currentDoc: MarkdownDocDetail | null;
  title: string;
  onTitleChange: (title: string) => void;
}

export const DocTitle: React.FC<DocTitleProps> = ({
  currentDoc,
  title,
  onTitleChange,
}) => {
  if (!currentDoc) return null;

  return (
    <div className="px-6 py-6 border-t bg-gradient-to-b from-card to-background">
      <input
        type="text"
        placeholder="输入文档标题..."
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onTitleChange(e.target.value)
        }
        className="w-full text-4xl font-bold bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/40 resize-none transition-all"
        style={{
          lineHeight: "1.3",
          letterSpacing: "-0.02em",
        }}
      />
      {currentDoc.updated_at && (
        <p className="text-sm text-muted-foreground mt-2">
          最后更新：
          {new Date(currentDoc.updated_at).toLocaleString("zh-CN")}
        </p>
      )}
    </div>
  );
};
