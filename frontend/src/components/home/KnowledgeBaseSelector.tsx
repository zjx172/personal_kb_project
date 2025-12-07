import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, X, Pencil, Check, Trash2 } from "lucide-react";
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
import { KnowledgeBase } from "../../api";

interface KnowledgeBaseSelectorProps {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  currentKnowledgeBaseId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  knowledgeBases,
  loading,
  currentKnowledgeBaseId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [updating, setUpdating] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const currentKnowledgeBase = knowledgeBases.find(
    (kb) => kb.id === currentKnowledgeBaseId
  );

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      return;
    }
    setCreating(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
      setShowCreateInput(false);
    } catch (error) {
      console.error("创建知识库失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (kb: KnowledgeBase, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(kb.id);
    setEditingName(kb.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      return;
    }
    setUpdating(true);
    try {
      await onUpdate(editingId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    } catch (error) {
      console.error("更新知识库失败:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentKnowledgeBaseId || undefined}
        onValueChange={onSelect}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px] h-9 shadow-sm">
          <SelectValue placeholder="选择知识库" />
        </SelectTrigger>
        <SelectContent>
          {knowledgeBases.map((kb) => (
            <div key={kb.id} className="relative">
              {editingId === kb.id ? (
                <div
                  className="flex items-center gap-1 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveEdit();
                      } else if (e.key === "Escape") {
                        handleCancelEdit();
                      }
                    }}
                    className="h-8 text-sm flex-1"
                    disabled={updating}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleSaveEdit}
                    disabled={updating || !editingName.trim()}
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleCancelEdit}
                    disabled={updating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group hover:bg-accent rounded-sm">
                  <SelectItem
                    value={kb.id}
                    className="flex-1 cursor-pointer pr-16"
                  >
                    {kb.name}
                  </SelectItem>
                  <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleStartEdit(kb, e);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            确定要删除这个知识库吗？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作无法撤销。知识库中的所有文档、对话和消息将被永久删除。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async (e) => {
                              e.stopPropagation();
                              await onDelete(kb.id);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="border-t p-1">
            {showCreateInput ? (
              <div className="flex items-center gap-1 p-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreate();
                    } else if (e.key === "Escape") {
                      setShowCreateInput(false);
                      setNewName("");
                    }
                  }}
                  placeholder="知识库名称"
                  className="h-8 text-sm"
                  autoFocus
                  disabled={creating}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowCreateInput(false);
                    setNewName("");
                  }}
                  disabled={creating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowCreateInput(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                新建知识库
              </Button>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};
