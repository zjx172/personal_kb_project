import { useState } from "react";
import { toast } from "sonner";
import { extractWebContent } from "../api";

export function useWebExtract(
  onSuccess?: () => void,
  knowledgeBaseId?: string | null
) {
  const [webUrl, setWebUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  const handleExtractWeb = async () => {
    if (!webUrl.trim()) {
      toast.warning("请输入网页 URL");
      return;
    }

    try {
      new URL(webUrl);
    } catch {
      toast.error("请输入有效的 URL");
      return;
    }

    setExtracting(true);
    try {
      const newDoc = await extractWebContent({
        url: webUrl,
        knowledge_base_id: knowledgeBaseId || undefined,
      });
      toast.success("网页内容已提取并保存");
      setWebUrl("");
      onSuccess?.();
      window.open(`/kb/${knowledgeBaseId}/doc/${newDoc.id}`, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "提取失败");
    } finally {
      setExtracting(false);
    }
  };

  return {
    webUrl,
    setWebUrl,
    extracting,
    handleExtractWeb,
  };
}
