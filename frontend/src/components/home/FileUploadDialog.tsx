import React, { useState, useRef } from "react";
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
import { Loader2, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  uploadProgress?: { progress: number; message: string; status: string } | null;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
  "text/markdown": [".md", ".markdown"],
};

const FILE_TYPE_LABELS: Record<string, string> = {
  ".pdf": "PDF文档",
  ".docx": "Word文档",
  ".ppt": "PowerPoint演示文稿",
  ".pptx": "PowerPoint演示文稿",
  ".md": "Markdown文档",
  ".markdown": "Markdown文档",
};

export const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  open,
  onOpenChange,
  onUpload,
  uploading,
  uploadProgress,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileExtension = (filename: string): string => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
    return ext;
  };

  const isValidFileType = (file: File): boolean => {
    const ext = getFileExtension(file.name);
    return Object.values(ACCEPTED_FILE_TYPES).flat().includes(ext);
  };

  const handleFileSelect = (file: File) => {
    if (!isValidFileType(file)) {
      toast.error(
        `不支持的文件类型。支持的类型：PDF, DOCX, PPT, PPTX, Markdown`
      );
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请选择要上传的文件");
      return;
    }

    try {
      await onUpload(selectedFile);
      // 上传成功后不关闭弹窗，让用户看到进度
    } catch (error) {
      console.error("上传失败:", error);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  const handleRemoveFile = () => {
    if (!uploading) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const acceptedExtensions = Object.values(ACCEPTED_FILE_TYPES)
    .flat()
    .join(",");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>
            支持上传 PDF、Word、PowerPoint 和 Markdown 文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 文件选择区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            } ${uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedExtensions}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={uploading}
            />
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="h-12 w-12 mx-auto text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {FILE_TYPE_LABELS[getFileExtension(selectedFile.name)] ||
                      "未知类型"}{" "}
                    · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    移除
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">点击或拖拽文件到此处</p>
                  <p className="text-xs text-muted-foreground">
                    支持 PDF, DOCX, PPT, PPTX, MD
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 上传进度 */}
          {uploadProgress && (
            <div className="space-y-2">
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            取消
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            上传
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
