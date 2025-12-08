import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { FileText, Trash2, Loader2 } from "lucide-react";
import { MarkdownDocItem } from "../../api";

interface DocListProps {
  docs: MarkdownDocItem[];
  loading: boolean;
  currentKnowledgeBaseId: string | null;
  onDelete: (id: string) => void;
}

export const DocList: React.FC<DocListProps> = ({
  docs,
  loading,
  currentKnowledgeBaseId,
  onDelete,
}) => {
  const navigate = useNavigate();

  const handleDocClick = (id: string) => {
    if (currentKnowledgeBaseId) {
      navigate(`/kb/${currentKnowledgeBaseId}/doc/${id}`);
    } else {
    navigate(`/doc/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        暂无文档
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {docs.map((item) => (
        <div
          key={item.id}
          className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
        >
          <div
            className="flex items-center gap-2.5 flex-1 min-w-0"
            onClick={() => handleDocClick(item.id)}
          >
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-foreground">
                {item.title}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {new Date(item.updated_at).toLocaleDateString("zh-CN", {
                  month: "2-digit",
                  day: "2-digit",
                })}
              </div>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除这个文档吗？</AlertDialogTitle>
                <AlertDialogDescription>
                  此操作无法撤销，文档将被永久删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(item.id)}
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
  );
};
