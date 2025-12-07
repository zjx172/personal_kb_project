import { useState, useRef } from "react";
import { toast } from "sonner";
import { uploadPdf } from "../api";

export function usePdfUpload(onSuccess?: () => void) {
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const newDoc = await uploadPdf(file, file.name.replace(".pdf", ""));
      toast.success("PDF文件已上传并保存");
      onSuccess?.();
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      window.open(`/doc/${newDoc.id}`, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "上传失败");
    } finally {
      setUploadingPdf(false);
    }
  };

  return {
    uploadingPdf,
    fileInputRef,
    handleUploadPdf,
  };
}
