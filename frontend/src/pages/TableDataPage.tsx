import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataSource, getDataSource } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, ArrowLeft, Database, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const TableDataPage: React.FC = () => {
  const navigate = useNavigate();
  const { knowledgeBaseId, dataSourceId } = useParams<{
    knowledgeBaseId: string;
    dataSourceId: string;
  }>();
  const { user, loading: authLoading } = useAuth();
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user && dataSourceId) {
      loadDataSource();
    }
  }, [user, authLoading, dataSourceId, navigate]);

  const loadDataSource = async () => {
    if (!dataSourceId) return;
    setLoading(true);
    try {
      const data = await getDataSource(dataSourceId);
      setDataSource(data);
    } catch (error: any) {
      console.error("加载数据源失败:", error);
      toast.error(error?.response?.data?.detail || "加载数据源失败");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dataSource) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">数据源不存在</p>
          <Button onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  // 解析表格数据
  const config = dataSource.config || {};
  let tableData: Record<string, any>[] = [];
  let columns: string[] = [];

  if (config.type === "manual_table") {
    // 手动创建的表格数据
    tableData = config.data || [];
    columns = config.columns || (tableData.length > 0 ? Object.keys(tableData[0]) : []);
  } else if (dataSource.type === "excel" && config.filename) {
    // Excel 文件数据（如果已解析）
    if (config.data) {
      tableData = config.data;
      columns = config.columns || (tableData.length > 0 ? Object.keys(tableData[0]) : []);
    }
  } else if (dataSource.type === "database") {
    // 数据库数据（如果已查询）
    if (config.data) {
      tableData = config.data;
      columns = config.columns || (tableData.length > 0 ? Object.keys(tableData[0]) : []);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              {dataSource.type === "database" ? (
                <Database className="h-5 w-5 text-primary" />
              ) : (
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              )}
              <div>
                <h1 className="text-xl font-semibold">{dataSource.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {dataSource.type === "database" ? "数据库" : "Excel"}
                  {config.type === "manual_table" && " (手动创建)"}
                </p>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {tableData.length} 行，{columns.length} 列
          </div>
        </div>
      </div>

      {/* 表格内容 */}
      <div className="flex-1 overflow-auto p-6">
        {tableData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                {config.type === "manual_table"
                  ? "暂无数据"
                  : dataSource.type === "database"
                  ? "数据库连接未配置或未查询数据"
                  : "Excel 文件未解析或为空"}
              </p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead
                      key={index}
                      className="min-w-[150px] bg-muted/50 sticky top-0 z-10"
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex} className="max-w-[300px]">
                        <div
                          className="truncate"
                          title={String(row[column] || "")}
                        >
                          {String(row[column] || "")}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableDataPage;

