import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { uploadPdf, getTaskStatus, TaskInfo } from "../api";

export interface PdfUploadProgress {
  progress: number;
  message: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export function usePdfUpload(
  onSuccess?: () => void,
  knowledgeBaseId?: string | null
) {
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<PdfUploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const pollTaskStatus = useCallback(
    (taskId: string) => {
      const maxAttempts = 300; // 最多轮询5分钟（每秒一次）
      let attempts = 0;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          toast.error("任务超时，请刷新页面查看状态");
          setUploadingPdf(false);
          setUploadProgress(null);
          if (pollingIntervalRef.current) {
            window.clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          return;
        }

        try {
          const taskInfo = await getTaskStatus(taskId);
          setUploadProgress({
            progress: taskInfo.progress,
            message: taskInfo.message,
            status: taskInfo.status,
          });

          if (taskInfo.status === "completed") {
            toast.success("PDF文件已上传并提取成功！");
            onSuccess?.();
            // 重置文件输入
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            // 打开文档页面
            if (taskInfo.result) {
              window.open(`/doc/${taskInfo.result.id}`, "_blank");
            }
            setUploadingPdf(false);
            setUploadProgress(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else if (taskInfo.status === "failed") {
            toast.error(taskInfo.error || "PDF处理失败");
            setUploadingPdf(false);
            setUploadProgress(null);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          } else {
            // 继续轮询
            attempts++;
          }
        } catch (error) {
          console.error("获取任务状态失败:", error);
          attempts++;
        }
      };

      // 立即执行一次，然后每秒轮询
      poll();
      pollingIntervalRef.current = window.setInterval(poll, 1000);
    },
    [onSuccess]
  );

  const handleUploadPdf = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("只支持PDF文件");
      return;
    }

    setUploadingPdf(true);
    setUploadProgress({
      progress: 0,
      message: "准备上传PDF文件...",
      status: "pending",
    });

    try {
      // uploadPdf 会自动判断是否使用分片上传
      const response = await uploadPdf(
        file,
        file.name.replace(".pdf", ""),
        knowledgeBaseId || undefined
      );
      // 开始轮询任务状态
      pollTaskStatus(response.task_id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "上传失败");
      setUploadingPdf(false);
      setUploadProgress(null);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

  return {
    uploadingPdf,
    uploadProgress,
    fileInputRef,
    handleUploadPdf,
  };
}
