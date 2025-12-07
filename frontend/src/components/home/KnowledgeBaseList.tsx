import React, { useState } from "react";
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
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { KnowledgeBase } from "../../api";

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  currentKnowledgeBaseId: string | null;
  editingKnowledgeBaseId: string | null;
  editingName: string;
  saving: boolean;
  nameInputRef: React.RefObject<HTMLInputElement>;
  expandedBases: Set<string>;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onStartEdit: (id: string, name: string, e: React.MouseEvent) => void;
  onSaveName: (id: string) => void;
  onCancelEdit: () => void;
  onNameChange: (value: string) => void;
  onToggleExpand: (id: string) => void;
}

export const KnowledgeBaseList: React.FC<KnowledgeBaseListProps> = ({
  knowledgeBases,
  loading,
  currentKnowledgeBaseId,
  editingKnowledgeBaseId,
  editingName,
  saving,
  nameInputRef,
  expandedBases,
  onSelect,
  onCreate,
  onDelete,
  onStartEdit,
  onSaveName,
  onCancelEdit,
  onNameChange,
  onToggleExpand,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-semibold text-muted-foreground">
          知识库
        </div>
        <Button
          onClick={onCreate}
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-accent"
          title="新建知识库"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-4">
          暂无知识库
        </div>
      ) : (
        <div className="space-y-1">
          {knowledgeBases.map((kb) => {
            const isExpanded = expandedBases.has(kb.id);
            const isCurrent = currentKnowledgeBaseId === kb.id;
            const isEditing = editingKnowledgeBaseId === kb.id;

            return (
              <div key={kb.id} className="space-y-1">
                <div
                  className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                    isCurrent
                      ? "bg-accent border border-primary/30 shadow-sm"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => {
                    if (!isEditing) {
                      onSelect(kb.id);
                      onToggleExpand(kb.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(kb.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          ref={nameInputRef}
                          value={editingName}
                          onChange={(e) => onNameChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onSaveName(kb.id);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              onCancelEdit();
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 text-sm flex-1"
                          disabled={saving}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveName(kb.id);
                          }}
                          disabled={saving}
                        >
                          {saving ? (
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
                          disabled={saving}
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate text-foreground">
                            {kb.name}
                          </div>
                          {kb.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {kb.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-accent"
                            onClick={(e) => onStartEdit(kb.id, kb.name, e)}
                            title="编辑名称"
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
                                title="删除知识库"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  确定要删除这个知识库吗？
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  此操作无法撤销，知识库及其所有对话将被永久删除。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(kb.id)}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
