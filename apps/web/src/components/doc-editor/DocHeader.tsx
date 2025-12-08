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
import { ArrowLeft, Save, Trash2, Loader2, Brain } from "lucide-react";
import { MarkdownDocDetail } from "../../api";

interface DocHeaderProps {
  saving: boolean;
  lastSaved: Date | null;
  currentDoc: MarkdownDocDetail | null;
  showReviewPanel: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  onToggleReviewPanel: () => void;
}

export const DocHeader: React.FC<DocHeaderProps> = ({
  saving,
  lastSaved,
  currentDoc,
  showReviewPanel,
  onBack,
  onSave,
  onDelete,
  onToggleReviewPanel,
}) => {
  return (
    <header className="border-b bg-card flex flex-col flex-shrink-0">
      <div className="h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleReviewPanel}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            {showReviewPanel ? "隐藏" : "复习知识"}
          </Button>
          {saving && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>保存中...</span>
            </div>
          )}
          {lastSaved && !saving && (
            <span className="text-xs text-muted-foreground">
              已保存：{lastSaved.toLocaleTimeString()}
            </span>
          )}
          {!lastSaved && currentDoc && !saving && (
            <span className="text-xs text-muted-foreground">
              最后保存：{new Date(currentDoc.updated_at).toLocaleString()}
            </span>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                删除
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
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
};
