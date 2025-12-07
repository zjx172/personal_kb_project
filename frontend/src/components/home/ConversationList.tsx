import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react";
import { Conversation } from "../../api";

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  currentConversationId: string | null;
  knowledgeBaseId: string | null; // 当前选中的知识库ID
  editingConversationId: string | null;
  editingTitle: string;
  savingTitle: boolean;
  titleInputRef: React.RefObject<HTMLInputElement>;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onStartEdit: (id: string, title: string, e: React.MouseEvent) => void;
  onSaveTitle: (id: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (value: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  currentConversationId,
  knowledgeBaseId,
  editingConversationId,
  editingTitle,
  savingTitle,
  titleInputRef,
  onSelect,
  onCreate,
  onDelete,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
}) => {
  // 如果没有选中知识库，不显示对话列表
  if (!knowledgeBaseId) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm font-semibold text-muted-foreground">
            对话
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground py-4">
          请先选择一个知识库
        </div>
      </div>
    );
  }

  // 过滤出当前知识库的对话
  const filteredConversations = conversations.filter(
    (conv) => conv.knowledge_base_id === knowledgeBaseId
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-semibold text-muted-foreground">对话</div>
        <Button
          onClick={onCreate}
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-accent"
          title="新建对话"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : filteredConversations.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-4">
          暂无对话
        </div>
      ) : (
        <div className="space-y-1">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                currentConversationId === conv.id
                  ? "bg-accent border border-primary/30 shadow-sm"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => {
                if (!editingConversationId) {
                  onSelect(conv.id);
                }
              }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {editingConversationId === conv.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      ref={titleInputRef}
                      value={editingTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSaveTitle(conv.id);
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          onCancelEdit();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-sm flex-1"
                      disabled={savingTitle}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSaveTitle(conv.id);
                      }}
                      disabled={savingTitle}
                    >
                      {savingTitle ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelEdit();
                      }}
                      disabled={savingTitle}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate text-foreground">
                        {conv.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(conv.updated_at).toLocaleDateString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-accent"
                        onClick={(e) => onStartEdit(conv.id, conv.title, e)}
                        title="编辑标题"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            title="删除对话"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              确定要删除这个对话吗？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              此操作无法撤销，对话及其所有消息将被永久删除。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(conv.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
