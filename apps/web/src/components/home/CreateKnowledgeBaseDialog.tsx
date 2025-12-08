import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { KnowledgeBaseCreate } from "../../api";

interface CreateKnowledgeBaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: KnowledgeBaseCreate) => Promise<void>;
}

export const CreateKnowledgeBaseDialog: React.FC<
  CreateKnowledgeBaseDialogProps
> = ({ open, onOpenChange, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"document" | "table">("document");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setCreating(true);
    try {
      const payload: KnowledgeBaseCreate = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        data_source: null, // 数据源在创建后单独配置
        data_source_config: null,
      };

      await onCreate(payload);
      // 重置表单
      setName("");
      setDescription("");
      setType("document");
      onOpenChange(false);
    } catch (error) {
      console.error("创建知识库失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setType("document");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建知识库</DialogTitle>
          <DialogDescription>选择知识库类型并填写相关信息</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 知识库名称 */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              知识库名称 <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入知识库名称"
              required
              disabled={creating}
            />
          </div>

          {/* 知识库描述 */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              描述（可选）
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入知识库描述"
              rows={3}
              disabled={creating}
            />
          </div>

          {/* 知识库类型 */}
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              知识库类型 <span className="text-red-500">*</span>
            </label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as "document" | "table");
                setDataSource("");
                setDatabaseConfig({
                  host: "",
                  port: "",
                  database: "",
                  username: "",
                  password: "",
                  table: "",
                });
                setExcelFile(null);
              }}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>文档型知识库</span>
                  </div>
                </SelectItem>
                <SelectItem value="table">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>表格型知识库</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 提示信息 */}
          {type === "table" && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                表格型知识库创建后，可以在左侧边栏配置数据源（支持多个数据源）
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={creating}
            >
              取消
            </Button>
            <Button type="submit" disabled={creating || !name.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
