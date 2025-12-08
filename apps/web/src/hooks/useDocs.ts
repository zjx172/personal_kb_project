import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { listDocs, createDoc, deleteDoc, MarkdownDocItem } from "../api";

export function useDocs(knowledgeBaseId?: string | null) {
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 当知识库 ID 变化时，自动重新加载文档
  useEffect(() => {
    if (knowledgeBaseId) {
      const loadDocs = async () => {
        setLoading(true);
        try {
          const data = await listDocs(knowledgeBaseId || undefined);
          setDocs(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadDocs();
    } else {
      // 如果没有知识库 ID，清空文档列表
      setDocs([]);
      setLoading(false);
    }
  }, [knowledgeBaseId]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDocs(knowledgeBaseId || undefined);
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [knowledgeBaseId]);

  const handleCreate = async () => {
    try {
      const newDoc = await createDoc({
        knowledge_base_id: knowledgeBaseId || undefined,
        title: "未命名文档",
        content: "",
      });

      window.open(`/kb/${knowledgeBaseId}/doc/${newDoc.id}`, "_blank");
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
