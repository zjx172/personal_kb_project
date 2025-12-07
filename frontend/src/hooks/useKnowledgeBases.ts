import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  listKnowledgeBases,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  KnowledgeBase,
  KnowledgeBaseCreate,
} from "../api";

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentKnowledgeBaseId, setCurrentKnowledgeBaseId] = useState<
    string | null
  >(null);
  const [editingKnowledgeBaseId, setEditingKnowledgeBaseId] = useState<
    string | null
  >(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedBases, setExpandedBases] = useState<Set<string>>(new Set());
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadKnowledgeBases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listKnowledgeBases();
      setKnowledgeBases(data);
      // 如果没有选中的知识库，且存在知识库，自动选中第一个
      if (!currentKnowledgeBaseId && data.length > 0) {
        setCurrentKnowledgeBaseId(data[0].id);
        setExpandedBases(new Set([data[0].id]));
      }
    } catch (error: any) {
      console.error("加载知识库失败:", error);
      toast.error(error?.message || "加载知识库失败");
    } finally {
      setLoading(false);
    }
  }, [currentKnowledgeBaseId]);

  const handleCreateKnowledgeBase = useCallback(async () => {
    try {
      const name = prompt("请输入知识库名称:");
      if (!name || !name.trim()) {
        return;
      }

      const payload: KnowledgeBaseCreate = {
        name: name.trim(),
        description: null,
      };

      const newKb = await createKnowledgeBase(payload);
      setKnowledgeBases((prev) => [newKb, ...prev]);
      setCurrentKnowledgeBaseId(newKb.id);
      setExpandedBases((prev) => new Set([...prev, newKb.id]));
      toast.success("知识库创建成功");
    } catch (error: any) {
      console.error("创建知识库失败:", error);
      toast.error(error?.message || "创建知识库失败");
    }
  }, []);

  const handleDeleteKnowledgeBase = useCallback(
    async (id: string) => {
      try {
        await deleteKnowledgeBase(id);
        setKnowledgeBases((prev) => prev.filter((kb) => kb.id !== id));
        // 如果删除的是当前选中的知识库，切换到其他知识库
        if (currentKnowledgeBaseId === id) {
          const remaining = knowledgeBases.filter((kb) => kb.id !== id);
          if (remaining.length > 0) {
            setCurrentKnowledgeBaseId(remaining[0].id);
            setExpandedBases(new Set([remaining[0].id]));
          } else {
            setCurrentKnowledgeBaseId(null);
            setExpandedBases(new Set());
          }
        }
        setExpandedBases((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
        toast.success("知识库已删除");
      } catch (error: any) {
        console.error("删除知识库失败:", error);
        toast.error(error?.message || "删除知识库失败");
      }
    },
    [currentKnowledgeBaseId, knowledgeBases]
  );

  const handleStartEditName = useCallback(
    (id: string, name: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingKnowledgeBaseId(id);
      setEditingName(name);
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 0);
    },
    []
  );

  const handleSaveName = useCallback(
    async (id: string) => {
      if (!editingName.trim()) {
        toast.error("知识库名称不能为空");
        return;
      }

      setSaving(true);
      try {
        const updated = await updateKnowledgeBase(id, {
          name: editingName.trim(),
        });
        setKnowledgeBases((prev) =>
          prev.map((kb) => (kb.id === id ? updated : kb))
        );
        setEditingKnowledgeBaseId(null);
        setEditingName("");
        toast.success("名称已更新");
      } catch (error: any) {
        console.error("更新知识库名称失败:", error);
        toast.error(error?.message || "更新知识库名称失败");
      } finally {
        setSaving(false);
      }
    },
    [editingName]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingKnowledgeBaseId(null);
    setEditingName("");
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedBases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return {
    knowledgeBases,
    loading,
    currentKnowledgeBaseId,
    editingKnowledgeBaseId,
    editingName,
    saving,
    expandedBases,
    nameInputRef,
    setCurrentKnowledgeBaseId,
    setEditingName,
    loadKnowledgeBases,
    handleCreateKnowledgeBase,
    handleDeleteKnowledgeBase,
    handleStartEditName,
    handleSaveName,
    handleCancelEdit,
    handleToggleExpand,
  };
}
