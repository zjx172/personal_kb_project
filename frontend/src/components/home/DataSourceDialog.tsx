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
import * as XLSX from "xlsx";
import { toast } from "sonner";

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
  const [excelData, setExcelData] = useState<Record<string, any>[] | null>(null);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = async (file: File) => {
    setParsingExcel(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      
      // 读取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 转换为 JSON 格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (jsonData.length === 0) {
        toast.error("Excel 文件为空");
        setParsingExcel(false);
        return;
      }
      
      // 获取列名（从第一行数据中提取）
      const columns = Object.keys(jsonData[0] as Record<string, any>);
      
      setExcelData(jsonData as Record<string, any>[]);
      setExcelColumns(columns);
      toast.success(`成功解析 Excel，共 ${jsonData.length} 行，${columns.length} 列`);
    } catch (error) {
      console.error("解析 Excel 失败:", error);
      toast.error("解析 Excel 文件失败，请检查文件格式");
      setExcelFile(null);
      setExcelData(null);
      setExcelColumns([]);
    } finally {
      setParsingExcel(false);
    }
  };

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
        toast.error("请选择 Excel 文件");
        return;
      }
      if (!excelData || excelData.length === 0) {
        toast.error("请等待 Excel 文件解析完成");
        return;
      }
    }

    setCreating(true);
    try {
      // 如果是 Excel，需要先解析文件
      let config: Record<string, any> = {};
      if (type === "database") {
        config = databaseConfig;
      } else if (type === "excel" && excelFile) {
        if (!excelData || excelData.length === 0) {
          toast.error("请先解析 Excel 文件");
          return;
        }
        // Excel 文件信息和解析后的数据
        config = {
          filename: excelFile.name,
          size: excelFile.size,
          type: excelFile.type,
          data: excelData,
          columns: excelColumns,
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
      setExcelData(null);
      setExcelColumns([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("创建数据源失败:", error);
      toast.error(error?.response?.data?.detail || error?.message || "创建数据源失败");
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
      setExcelData(null);
      setExcelColumns([]);
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
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setExcelFile(file);
                    await parseExcelFile(file);
                  }
                }}
                disabled={creating || parsingExcel}
              />
              {parsingExcel && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>正在解析 Excel 文件...</span>
                </div>
              )}
              {excelFile && !parsingExcel && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    已选择: {excelFile.name}
                  </p>
                  {excelData && (
                    <p className="text-xs text-green-600">
                      解析成功: {excelData.length} 行，{excelColumns.length} 列
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
