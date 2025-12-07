import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Globe, FileText, Loader2 } from "lucide-react";
import { DocList } from "./DocList";
import { ConversationList } from "./ConversationList";
import { MarkdownDocItem, Conversation } from "../../api";

interface SidebarProps {
  open: boolean;
  width: number;
  docs: MarkdownDocItem[];
  loadingDocs: boolean;
  currentKnowledgeBaseId: string | null;
  conversations: Conversation[];
  loadingConversations: boolean;
  currentConversationId: string | null;
  editingConversationId: string | null;
  editingTitle: string;
  savingTitle: boolean;
  webUrl: string;
  extracting: boolean;
  uploadingPdf: boolean;
  uploadProgress?: { progress: number; message: string; status: string } | null;
  onToggle: () => void;
  onResize: (width: number) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onWebUrlChange: (value: string) => void;
  onExtractWeb: () => void;
  onUploadPdf: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onStartEditTitle: (id: string, title: string, e: React.MouseEvent) => void;
  onSaveTitle: (id: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (value: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  width,
  docs,
  loadingDocs,
  currentKnowledgeBaseId,
  conversations,
  loadingConversations,
  currentConversationId,
  editingConversationId,
  editingTitle,
  savingTitle,
  webUrl,
  extracting,
  uploadingPdf,
  uploadProgress,
  onResize,
  onCreateDoc,
  onDeleteDoc,
  onWebUrlChange,
  onExtractWeb,
  onUploadPdf,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onStartEditTitle,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  titleInputRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !sidebarRef.current) return;

      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = 600;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={sidebarRef}
      className="relative flex border-r bg-card transition-all duration-300 h-full overflow-hidden"
      style={{
        width: open ? `${width}px` : "0px",
        minWidth: open ? `${width}px` : "0px",
        maxWidth: open ? `${width}px` : "0px",
      }}
    >
      <aside className="flex flex-col overflow-hidden flex-1">
        <div className={`${open ? "p-4" : "p-0"} space-y-4`}>
          {open && (
            <>
              <Button onClick={onCreateDoc} className="w-full" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建文档
              </Button>

              <div className="space-y-2">
                <Input
                  placeholder="输入网页 URL..."
                  value={webUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onWebUrlChange(e.target.value)
                  }
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      onExtractWeb();
                    }
                  }}
                  className="h-9"
                />
                <Button
                  variant="outline"
                  onClick={onExtractWeb}
                  disabled={extracting}
                  className="w-full"
                  size="sm"
                >
                  {extracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  提取网页
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={onUploadPdf}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPdf}
                  className="w-full"
                  size="sm"
                >
                  {uploadingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  上传PDF
                </Button>
                {uploadProgress && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{uploadProgress.message}</span>
                      <span>{uploadProgress.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className={`flex-1 overflow-y-auto ${open ? "px-4 pb-4" : "px-0 pb-0"}`}
        >
          {open && (
            <>
              <DocList
                docs={docs}
                loading={loadingDocs}
                currentKnowledgeBaseId={currentKnowledgeBaseId}
                onDelete={onDeleteDoc}
              />

              {currentKnowledgeBaseId && (
                <>
                  <div className="border-t my-4" />
                  <ConversationList
                    conversations={conversations}
                    loading={loadingConversations}
                    currentConversationId={currentConversationId}
                    knowledgeBaseId={currentKnowledgeBaseId}
                    editingConversationId={editingConversationId}
                    editingTitle={editingTitle}
                    savingTitle={savingTitle}
                    titleInputRef={titleInputRef}
                    onSelect={onSelectConversation}
                    onCreate={onCreateConversation}
                    onDelete={onDeleteConversation}
                    onStartEdit={onStartEditTitle}
                    onSaveTitle={onSaveTitle}
                    onCancelEdit={onCancelEdit}
                    onTitleChange={onTitleChange}
                  />
                </>
              )}
            </>
          )}
        </div>
      </aside>
      {open && (
        <div
          ref={resizeHandleRef}
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize group transition-all z-20"
          style={{ touchAction: "none" }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-full bg-transparent hover:bg-primary/20 transition-colors" />
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-border group-hover:bg-primary/80 transition-colors opacity-60 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};
