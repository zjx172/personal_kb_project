import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Globe, FileText, Loader2 } from "lucide-react";
import { DocList } from "./DocList";
import { ConversationList } from "./ConversationList";
import { MarkdownDocItem, Conversation } from "../../api";

interface SidebarProps {
  open: boolean;
  docs: MarkdownDocItem[];
  loadingDocs: boolean;
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
  docs,
  loadingDocs,
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

  return (
    <aside
      className={`${
        open ? "w-64" : "w-0"
      } border-r bg-card flex flex-col transition-all duration-300 overflow-hidden`}
    >
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

            <div className="text-sm font-semibold text-muted-foreground pt-2">
              知识库
            </div>
          </>
        )}
      </div>

      <div
        className={`flex-1 overflow-y-auto ${open ? "px-4 pb-4" : "px-0 pb-0"}`}
      >
        {open && (
          <>
            <DocList docs={docs} loading={loadingDocs} onDelete={onDeleteDoc} />

            <div className="border-t my-4" />

            <ConversationList
              conversations={conversations}
              loading={loadingConversations}
              currentConversationId={currentConversationId}
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
      </div>
    </aside>
  );
};
