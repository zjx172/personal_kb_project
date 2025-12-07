import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TableDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBaseId: string;
  onSave: (data: Record<string, any>[]) => Promise<void>;
}

export const TableDataDialog: React.FC<TableDataDialogProps> = ({
  open,
  onOpenChange,
  knowledgeBaseId,
  onSave,
}) => {
  const [columns, setColumns] = useState<string[]>(["列1", "列2"]);
  const [rows, setRows] = useState<Record<string, any>[]>([
    { "列1": "", "列2": "" },
  ]);
  const [saving, setSaving] = useState(false);

  const handleAddColumn = () => {
    const newColumn = `列${columns.length + 1}`;
    setColumns([...columns, newColumn]);
    setRows(
      rows.map((row) => ({
        ...row,
        [newColumn]: "",
      }))
    );
  };

  const handleRemoveColumn = (columnIndex: number) => {
    const columnToRemove = columns[columnIndex];
    const newColumns = columns.filter((_, i) => i !== columnIndex);
    setColumns(newColumns);
    setRows(
      rows.map((row) => {
        const newRow = { ...row };
        delete newRow[columnToRemove];
        return newRow;
      })
    );
  };

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach((col) => {
      newRow[col] = "";
    });
    setRows([...rows, newRow]);
  };

  const handleRemoveRow = (rowIndex: number) => {
    setRows(rows.filter((_, i) => i !== rowIndex));
  };

  const handleCellChange = (
    rowIndex: number,
    column: string,
    value: string
  ) => {
    const newRows = [...rows];
    newRows[rowIndex] = {
      ...newRows[rowIndex],
      [column]: value,
    };
    setRows(newRows);
  };

  const handleColumnNameChange = (oldName: string, newName: string) => {
    if (newName === oldName || !newName.trim()) return;
    if (columns.includes(newName)) {
      alert("列名不能重复");
      return;
    }
    const newColumns = columns.map((col) => (col === oldName ? newName : col));
    setColumns(newColumns);
    setRows(
      rows.map((row) => {
        const newRow = { ...row };
        newRow[newName] = newRow[oldName];
        delete newRow[oldName];
        return newRow;
      })
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setSaving(true);
    try {
      await onSave(rows);
      // 重置表单
      setColumns(["列1", "列2"]);
      setRows([{ "列1": "", "列2": "" }]);
      onOpenChange(false);
    } catch (error) {
      console.error("保存数据失败:", error);
      // 不关闭对话框，让用户看到错误
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setColumns(["列1", "列2"]);
    setRows([{ "列1": "", "列2": "" }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建数据</DialogTitle>
          <DialogDescription>
            创建表格数据，可以添加列和行
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* 列管理 */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">列管理</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
            >
              <Plus className="h-4 w-4 mr-2" />
              添加列
            </Button>
          </div>

          {/* 表格 */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, colIndex) => (
                    <TableHead key={colIndex} className="min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <Input
                          value={column}
                          onChange={(e) =>
                            handleColumnNameChange(column, e.target.value)
                          }
                          className="h-8"
                          disabled={saving}
                        />
                        {columns.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleRemoveColumn(colIndex)}
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[100px]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAddRow}
                      disabled={saving}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加行
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={column}>
                        <Input
                          value={row[column] || ""}
                          onChange={(e) =>
                            handleCellChange(rowIndex, column, e.target.value)
                          }
                          className="h-8"
                          disabled={saving}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      {rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveRow(rowIndex)}
                          disabled={saving}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
          >
            取消
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

