import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Globe,
  FileText,
  Loader2,
  FileSpreadsheet,
  Database,
} from "lucide-react";
import { DocList } from "./DocList";
import { ConversationList } from "./ConversationList";
import { MarkdownDocItem, Conversation, DataSource } from "../../api";
import { DataSourceList } from "./DataSourceList";
import { DataSourceDialog } from "./DataSourceDialog";
import { FileUploadDialog } from "./FileUploadDialog";
import { TableDataDialog } from "./TableDataDialog";
import { toast } from "sonner";

interface SidebarProps {
  open: boolean;
  width: number;
  docs: MarkdownDocItem[];
  loadingDocs: boolean;
  currentKnowledgeBaseId: string | null;
  currentKnowledgeBaseType?: string | null;
  conversations: Conversation[];
  loadingConversations: boolean;
  currentConversationId: string | null;
  editingConversationId: string | null;
  editingTitle: string;
  savingTitle: boolean;
  // 文档型知识库的操作
  webUrl?: string;
  extracting?: boolean;
  uploadingFile?: boolean;
  uploadProgress?: { progress: number; message: string; status: string } | null;
  showUploadDialog?: boolean;
  onCreateDoc?: () => void;
  onWebUrlChange?: (value: string) => void;
  onExtractWeb?: () => void;
  onUploadFile?: (file: File) => Promise<void>;
  onShowUploadDialog?: (show: boolean) => void;
  // 通用操作
  onToggle: () => void;
  onResize: (width: number) => void;
  onDeleteDoc: (id: string) => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onStartEditTitle: (id: string, title: string, e: React.MouseEvent) => void;
  onSaveTitle: (id: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (value: string) => void;
  titleInputRef: React.RefObject<HTMLInputElement>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  width,
  docs,
  loadingDocs,
  currentKnowledgeBaseId,
  currentKnowledgeBaseType,
  conversations,
  loadingConversations,
  currentConversationId,
  editingConversationId,
  editingTitle,
  savingTitle,
  webUrl = "",
  extracting = false,
  uploadingFile = false,
  uploadProgress,
  showUploadDialog = false,
  onCreateDoc,
  onWebUrlChange,
  onExtractWeb,
  onUploadFile,
  onShowUploadDialog,
  onResize,
  onDeleteDoc,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onStartEditTitle,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  titleInputRef,
}) => {
  const [dataSources, setDataSources] = React.useState<DataSource[]>([]);
  const [loadingDataSources, setLoadingDataSources] = React.useState(false);
  const [showDataSourceDialog, setShowDataSourceDialog] = React.useState(false);
  const [showTableDataDialog, setShowTableDataDialog] = React.useState(false);

  // 加载数据源列表
  const loadDataSources = React.useCallback(async () => {
    if (currentKnowledgeBaseId && currentKnowledgeBaseType === "table") {
      setLoadingDataSources(true);
      try {
        const { listDataSources } = await import("../../api");
        const data = await listDataSources(currentKnowledgeBaseId);
        setDataSources(data);
      } catch (error) {
        console.error("加载数据源失败:", error);
        toast.error("加载数据源失败");
      } finally {
        setLoadingDataSources(false);
      }
    } else {
      setDataSources([]);
    }
  }, [currentKnowledgeBaseId, currentKnowledgeBaseType]);

  React.useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  // 删除数据源的处理函数
  const handleDeleteDataSource = React.useCallback(
    async (id: string) => {
      try {
        const { deleteDataSource } = await import("../../api");
        await deleteDataSource(id);
        // 重新加载数据源列表
        await loadDataSources();
        toast.success("数据源已删除");
      } catch (error: any) {
        console.error("删除数据源失败:", error);
        toast.error(
          error?.response?.data?.detail || error?.message || "删除数据源失败"
        );
        throw error; // 重新抛出错误，让调用者知道删除失败
      }
    },
    [loadDataSources]
  );
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !sidebarRef.current) return;

      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = 600;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={sidebarRef}
      className="relative flex border-r bg-card transition-all duration-300 h-full overflow-hidden"
      style={{
        width: open ? `${width}px` : "0px",
        minWidth: open ? `${width}px` : "0px",
        maxWidth: open ? `${width}px` : "0px",
      }}
    >
      <aside className="flex flex-col overflow-hidden flex-1">
        <div className={`${open ? "p-4" : "p-0"} space-y-4`}>
          {open && (
            <>
              {/* 文档型知识库的操作 */}
              {currentKnowledgeBaseType !== "table" &&
                currentKnowledgeBaseId && (
                  <>
                    <Button onClick={onCreateDoc} className="w-full" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      新建文档
                    </Button>

                    <div className="space-y-2">
                      <Input
                        placeholder="输入网页 URL..."
                        value={webUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          onWebUrlChange?.(e.target.value)
                        }
                        onKeyPress={(
                          e: React.KeyboardEvent<HTMLInputElement>
                        ) => {
                          if (e.key === "Enter") {
                            onExtractWeb?.();
                          }
                        }}
                        className="h-9"
                      />
                      <Button
                        variant="outline"
                        onClick={onExtractWeb}
                        disabled={extracting}
                        className="w-full"
                        size="sm"
                      >
                        {extracting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Globe className="mr-2 h-4 w-4" />
                        )}
                        提取网页
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onShowUploadDialog?.(true)}
                        disabled={uploadingFile}
                        className="w-full"
                        size="sm"
                      >
                        {uploadingFile ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        上传文件
                      </Button>
                      {uploadProgress && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{uploadProgress.message}</span>
                            <span>{uploadProgress.progress}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

              {/* 表格型知识库的操作 */}
              {currentKnowledgeBaseType === "table" &&
                currentKnowledgeBaseId && (
                  <>
                    <Button
                      onClick={() => setShowTableDataDialog(true)}
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      新建数据
                    </Button>
                    <Button
                      onClick={() => {
                        // 打开 Excel 导入对话框
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".xlsx,.xls";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) {
                            // 导入 Excel 作为数据源
                            setShowDataSourceDialog(true);
                            // TODO: 解析 Excel 并展示
                          }
                        };
                        input.click();
                      }}
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      导入 Excel
                    </Button>
                  </>
                )}
            </>
          )}
        </div>

        <div
          className={`flex-1 overflow-y-auto ${open ? "px-4 pb-4" : "px-0 pb-0"}`}
        >
          {open && (
            <>
              {/* 文档列表（仅文档型知识库显示） */}
              {currentKnowledgeBaseType !== "table" && (
                <DocList
                  docs={docs}
                  loading={loadingDocs}
                  currentKnowledgeBaseId={currentKnowledgeBaseId}
                  onDelete={onDeleteDoc}
                />
              )}

              {/* 数据源列表（仅表格型知识库显示） */}
              {currentKnowledgeBaseType === "table" &&
                currentKnowledgeBaseId && (
                  <>
                    <DataSourceList
                      dataSources={dataSources}
                      loading={loadingDataSources}
                      knowledgeBaseId={currentKnowledgeBaseId}
                      onAdd={() => setShowDataSourceDialog(true)}
                      onDelete={handleDeleteDataSource}
                    />
                    <div className="border-t my-4" />
                  </>
                )}

              {currentKnowledgeBaseId && (
                <>
                  {currentKnowledgeBaseType !== "table" && (
                    <div className="border-t my-4" />
                  )}
                  <ConversationList
                    conversations={conversations}
                    loading={loadingConversations}
                    currentConversationId={currentConversationId}
                    knowledgeBaseId={currentKnowledgeBaseId}
                    editingConversationId={editingConversationId}
                    editingTitle={editingTitle}
                    savingTitle={savingTitle}
                    titleInputRef={titleInputRef}
                    onSelect={onSelectConversation}
                    onCreate={onCreateConversation}
                    onDelete={onDeleteConversation}
                    onStartEdit={onStartEditTitle}
                    onSaveTitle={onSaveTitle}
                    onCancelEdit={onCancelEdit}
                    onTitleChange={onTitleChange}
                  />
                </>
              )}
            </>
          )}
        </div>
      </aside>
      {/* 数据源对话框 */}
      {currentKnowledgeBaseId && currentKnowledgeBaseType === "table" && (
        <>
          <DataSourceDialog
            open={showDataSourceDialog}
            onOpenChange={setShowDataSourceDialog}
            knowledgeBaseId={currentKnowledgeBaseId}
            onCreate={async (payload) => {
              try {
                const { createDataSource, listDataSources } =
                  await import("../../api");
                await createDataSource(payload);
                // 重新加载数据源列表
                const updated = await listDataSources(currentKnowledgeBaseId);
                setDataSources(updated);
              } catch (error) {
                console.error("创建数据源失败:", error);
                throw error;
              }
            }}
          />
          <TableDataDialog
            open={showTableDataDialog}
            onOpenChange={setShowTableDataDialog}
            knowledgeBaseId={currentKnowledgeBaseId}
            onSave={async (data) => {
              try {
                const { createDataSource, listDataSources } =
                  await import("../../api");
                // 生成数据源名称（使用时间戳）
                const dataSourceName = `表格数据_${new Date().toLocaleString()}`;
                // 保存表格数据作为数据源
                await createDataSource({
                  knowledge_base_id: currentKnowledgeBaseId!,
                  type: "excel", // 使用 excel 类型，但实际是手动创建的表格数据
                  name: dataSourceName,
                  config: {
                    type: "manual_table",
                    data: data,
                    columns: data.length > 0 ? Object.keys(data[0]) : [],
                  },
                });
                // 重新加载数据源列表
                const updated = await listDataSources(currentKnowledgeBaseId!);
                setDataSources(updated);
                // 显示成功提示
                const { toast } = await import("sonner");
                toast.success("表格数据保存成功");
              } catch (error: any) {
                console.error("保存表格数据失败:", error);
                const { toast } = await import("sonner");
                toast.error(
                  error?.response?.data?.detail ||
                    error?.message ||
                    "保存表格数据失败"
                );
                throw error;
              }
            }}
          />
        </>
      )}

      {/* 文件上传对话框（文档型知识库） */}
      {currentKnowledgeBaseId &&
        currentKnowledgeBaseType !== "table" &&
        onShowUploadDialog &&
        onUploadFile && (
          <FileUploadDialog
            open={showUploadDialog}
            onOpenChange={onShowUploadDialog}
            onUpload={onUploadFile}
            uploading={uploadingFile}
            uploadProgress={uploadProgress}
          />
        )}
      {open && (
        <div
          ref={resizeHandleRef}
          onMouseDown={handleMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize group transition-all z-20"
          style={{ touchAction: "none" }}
        >
          <div className="absolute right-0 top-0 bottom-0 w-full bg-transparent hover:bg-primary/20 transition-colors" />
          <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-border group-hover:bg-primary/80 transition-colors opacity-60 group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
};
