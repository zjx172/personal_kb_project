import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Database, FileSpreadsheet } from "lucide-react";
import { DataSourceCreate } from "../../api";

interface DataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId: string;
  onCreate: (payload: DataSourceCreate) => Promise<void>;
}

export const DataSourceDialog: React.FC<DataSourceDialogProps> = ({
  open,
  onOpenChange,
  knowledgeBaseId,
  onCreate,
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<"database" | "excel">("database");
  const [databaseConfig, setDatabaseConfig] = useState({
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
    table: "",
  });
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    // 验证配置
    if (type === "database") {
      if (
        !databaseConfig.host ||
        !databaseConfig.port ||
        !databaseConfig.database ||
        !databaseConfig.username ||
        !databaseConfig.password ||
        !databaseConfig.table
      ) {
        alert("请填写完整的数据库配置信息");
        return;
      }
    } else if (type === "excel") {
      if (!excelFile) {
        alert("请选择 Excel 文件");
        return;
      }
    }

    setCreating(true);
    try {
      // 如果是 Excel，需要先上传文件
      let config: Record<string, any> = {};
      if (type === "database") {
        config = databaseConfig;
      } else if (type === "excel" && excelFile) {
        // Excel 文件信息（实际文件上传可以在后续实现）
        config = {
          filename: excelFile.name,
          size: excelFile.size,
          type: excelFile.type,
        };
      }

      const payload: DataSourceCreate = {
        knowledge_base_id: knowledgeBaseId,
        type,
        name: name.trim(),
        config,
      };

      await onCreate(payload);
      // 重置表单
      setName("");
      setType("database");
      setDatabaseConfig({
        host: "",
        port: "",
        database: "",
        username: "",
        password: "",
        table: "",
      });
      setExcelFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error) {
      console.error("创建数据源失败:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setType("database");
    setDatabaseConfig({
      host: "",
      port: "",
      database: "",
      username: "",
      password: "",
      table: "",
    });
    setExcelFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加数据源</DialogTitle>
          <DialogDescription>
            为表格型知识库添加数据源，支持数据库和 Excel 文件
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 数据源名称 */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              数据源名称 <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入数据源名称"
              required
              disabled={creating}
            />
          </div>

          {/* 数据源类型 */}
          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-medium">
              数据源类型 <span className="text-red-500">*</span>
            </label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as "database" | "excel");
                setDatabaseConfig({
                  host: "",
                  port: "",
                  database: "",
                  username: "",
                  password: "",
                  table: "",
                });
                setExcelFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="database">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>数据库</span>
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel 表格</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 数据库配置 */}
          {type === "database" && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium">数据库连接配置</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    主机地址
                  </label>
                  <Input
                    value={databaseConfig.host}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        host: e.target.value,
                      })
                    }
                    placeholder="localhost"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">端口</label>
                  <Input
                    value={databaseConfig.port}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        port: e.target.value,
                      })
                    }
                    placeholder="3306"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    数据库名
                  </label>
                  <Input
                    value={databaseConfig.database}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        database: e.target.value,
                      })
                    }
                    placeholder="database_name"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">表名</label>
                  <Input
                    value={databaseConfig.table}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        table: e.target.value,
                      })
                    }
                    placeholder="table_name"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    用户名
                  </label>
                  <Input
                    value={databaseConfig.username}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        username: e.target.value,
                      })
                    }
                    placeholder="username"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">密码</label>
                  <Input
                    type="password"
                    value={databaseConfig.password}
                    onChange={(e) =>
                      setDatabaseConfig({
                        ...databaseConfig,
                        password: e.target.value,
                      })
                    }
                    placeholder="password"
                    disabled={creating}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Excel 文件上传 */}
          {type === "excel" && (
            <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
              <label className="text-sm font-medium">Excel 文件</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setExcelFile(file);
                  }
                }}
                disabled={creating}
              />
              {excelFile && (
                <p className="text-xs text-muted-foreground">
                  已选择: {excelFile.name}
                </p>
              )}
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
