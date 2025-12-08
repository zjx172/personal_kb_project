import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataSource } from "../../api";

interface TableDataPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSource: DataSource | null;
}

export const TableDataPreview: React.FC<TableDataPreviewProps> = ({
  open,
  onOpenChange,
  dataSource,
}) => {
  if (!dataSource) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dataSource.name}</DialogTitle>
          <DialogDescription>
            数据源类型: {dataSource.type === "database" ? "数据库" : "Excel"}
            {config.type === "manual_table" && " (手动创建)"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto pr-4">
          {tableData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {config.type === "manual_table"
                ? "暂无数据"
                : dataSource.type === "database"
                ? "数据库连接未配置或未查询数据"
                : "Excel 文件未解析或为空"}
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableHead key={index} className="min-w-[120px] bg-muted/50 sticky top-0">
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
                          <div className="truncate" title={String(row[column] || "")}>
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
        <div className="text-xs text-muted-foreground mt-2">
          共 {tableData.length} 行，{columns.length} 列
        </div>
      </DialogContent>
    </Dialog>
  );
};

