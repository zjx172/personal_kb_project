import React from "react";
import { Button } from "@/components/ui/button";
import { Database, FileSpreadsheet, Plus, Trash2, Loader2 } from "lucide-react";
import { DataSource } from "../../api";
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

interface DataSourceListProps {
  dataSources: DataSource[];
  loading: boolean;
  knowledgeBaseId: string;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export const DataSourceList: React.FC<DataSourceListProps> = ({
  dataSources,
  loading,
  knowledgeBaseId,
  onAdd,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">数据源</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="h-7 px-2 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          添加
        </Button>
      </div>
      {dataSources.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground py-4 border border-dashed rounded-lg">
          暂无数据源
          <br />
          <Button
            variant="link"
            size="sm"
            onClick={onAdd}
            className="h-auto p-0 text-xs mt-1"
          >
            点击添加
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {dataSources.map((ds) => (
            <div
              key={ds.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {ds.type === "database" ? (
                  <Database className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span className="text-sm truncate">{ds.name}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      确定要删除这个数据源吗？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。数据源配置将被永久删除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(ds.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
