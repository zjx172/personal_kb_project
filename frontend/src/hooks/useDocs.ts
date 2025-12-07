import { useState } from "react";
import { toast } from "sonner";
import { listDocs, createDoc, deleteDoc, MarkdownDocItem } from "../api";

export function useDocs() {
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await listDocs();
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newDoc = await createDoc({
        title: "未命名文档",
        content: "",
      });
      window.open(`/doc/${newDoc.id}`, "_blank");
      toast.success("文档已创建");
    } catch (e) {
      console.error(e);
      toast.error("创建文档失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(id);
      toast.success("文档已删除");
      await loadDocs();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "删除失败");
    }
  };

  return {
    docs,
    loading,
    loadDocs,
    handleCreate,
    handleDelete,
  };
}
