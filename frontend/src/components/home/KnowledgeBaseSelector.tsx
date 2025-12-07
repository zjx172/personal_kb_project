import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, X } from "lucide-react";
import { KnowledgeBase } from "../../api";

interface KnowledgeBaseSelectorProps {
  knowledgeBases: KnowledgeBase[];
  loading: boolean;
  currentKnowledgeBaseId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
}

export const KnowledgeBaseSelector: React.FC<KnowledgeBaseSelectorProps> = ({
  knowledgeBases,
  loading,
  currentKnowledgeBaseId,
  onSelect,
  onCreate,
}) => {
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

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

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentKnowledgeBaseId || undefined}
        onValueChange={onSelect}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="选择知识库" />
        </SelectTrigger>
        <SelectContent>
          {knowledgeBases.map((kb) => (
            <SelectItem key={kb.id} value={kb.id}>
              {kb.name}
            </SelectItem>
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
