import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  updateConversation,
  Conversation,
  ConversationDetail,
  SearchHistoryItem,
} from "../api";
import { Message } from "../types/chat";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const convs = await listConversations();
      setConversations(convs);

      // 不再自动选中对话，让用户手动选择
      // 如果有对话但没有当前对话，选择最新的对话
      // if (convs.length > 0 && !currentConversationId) {
      //   setCurrentConversationId(convs[0].id);
      // }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (
    conversationId: string
  ): Promise<Message[]> => {
    try {
      const detail = await getConversation(conversationId);

      // 将消息转换为对话消息格式
      const conversationMessages: Message[] = [];
      for (const item of detail.messages) {
        // 添加用户消息
        conversationMessages.push({
          id: `user-${item.id}`,
          role: "user",
          content: item.query,
          timestamp: new Date(item.created_at),
        });

        // 如果有答案，添加助手消息
        if (item.answer) {
          conversationMessages.push({
            id: `assistant-${item.id}`,
            role: "assistant",
            content: item.answer,
            citations: item.citations || [],
            sourcesCount: item.sources_count || 0,
            timestamp: new Date(item.created_at),
          });
        }
      }
      return conversationMessages;
    } catch (e) {
      console.error("loadConversationMessages 错误:", e);
      return [];
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
      await loadConversations();
      return newConv.id;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "创建对话失败");
      return null;
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      toast.success("对话已删除");

      // 如果删除的是当前对话，切换到其他对话
      if (conversationId === currentConversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          setCurrentConversationId(null);
        }
      }

      await loadConversations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "删除对话失败");
    }
  };

  const handleStartEditTitle = (
    conversationId: string,
    currentTitle: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingConversationId(conversationId);
    setEditingTitle(currentTitle);
    // 延迟聚焦，确保输入框已渲染
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleSaveTitle = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      toast.warning("标题不能为空");
      return;
    }

    setSavingTitle(true);
    try {
      await updateConversation(conversationId, editingTitle.trim());
      toast.success("标题已更新");
      setEditingConversationId(null);
      setEditingTitle("");
      await loadConversations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "更新标题失败");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingConversationId(null);
    setEditingTitle("");
  };

  return {
    conversations,
    currentConversationId,
    loadingConversations,
    editingConversationId,
    editingTitle,
    savingTitle,
    titleInputRef,
    setCurrentConversationId,
    setEditingTitle,
    loadConversations,
    loadConversationMessages,
    handleCreateConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleStartEditTitle,
    handleSaveTitle,
    handleCancelEdit,
  };
}
