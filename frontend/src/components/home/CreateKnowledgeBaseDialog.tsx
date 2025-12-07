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
import { Loader2, Database, FileSpreadsheet, FileText } from "lucide-react";
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
  const [dataSource, setDataSource] = useState<"database" | "excel" | "">("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    // 如果是表格型知识库，验证数据源配置
    if (type === "table") {
      if (!dataSource) {
        alert("请选择数据源类型");
        return;
      }
      if (dataSource === "database") {
        // 验证数据库配置
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
      } else if (dataSource === "excel") {
        if (!excelFile) {
          alert("请选择 Excel 文件");
          return;
        }
      }
    }

    setCreating(true);
    try {
      const payload: KnowledgeBaseCreate = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        data_source: type === "table" ? dataSource : null,
        data_source_config:
          type === "table"
            ? dataSource === "database"
              ? databaseConfig
              : dataSource === "excel"
                ? { filename: excelFile?.name }
                : null
            : null,
      };

      await onCreate(payload);
      // 重置表单
      setName("");
      setDescription("");
      setType("document");
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

          {/* 表格型知识库的数据源配置 */}
          {type === "table" && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <label htmlFor="dataSource" className="text-sm font-medium">
                  数据源类型 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={dataSource}
                  onValueChange={(value) => {
                    setDataSource(value as "database" | "excel");
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
                    <SelectValue placeholder="请选择数据源类型" />
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
              {dataSource === "database" && (
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
                      <label className="text-xs text-muted-foreground">
                        端口
                      </label>
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
                      <label className="text-xs text-muted-foreground">
                        表名
                      </label>
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
                      <label className="text-xs text-muted-foreground">
                        密码
                      </label>
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
              {dataSource === "excel" && (
                <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                  <label className="text-sm font-medium">Excel 文件</label>
                  <Input
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
