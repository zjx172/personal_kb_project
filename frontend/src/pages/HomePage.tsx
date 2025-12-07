import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { SearchFilterOptions } from "../components/SearchFilters";
import { Message } from "../types/chat";
import { useConversations } from "../hooks/useConversations";
import { useKnowledgeBases } from "../hooks/useKnowledgeBases";
import { useDocs } from "../hooks/useDocs";
import { useStreamQuery } from "../hooks/useStreamQuery";
import { useWebExtract } from "../hooks/useWebExtract";
import { usePdfUpload } from "../hooks/usePdfUpload";
import { createKnowledgeBase } from "../api";
import { Sidebar } from "../components/home/Sidebar";
import { MessageList } from "../components/home/MessageList";
import { ChatInput } from "../components/home/ChatInput";
import { KnowledgeBaseSelector } from "../components/home/KnowledgeBaseSelector";
import { ChevronLeft, Menu, LogOut, User, Loader2 } from "lucide-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilterOptions>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const {
    knowledgeBases,
    loading: loadingKnowledgeBases,
    currentKnowledgeBaseId,
    setCurrentKnowledgeBaseId,
    loadKnowledgeBases,
    handleUpdateKnowledgeBase,
  } = useKnowledgeBases();

  const {
    docs,
    loading: loadingDocs,
    loadDocs,
    handleCreate: handleCreateDoc,
    handleDelete: handleDeleteDoc,
  } = useDocs(currentKnowledgeBaseId);

  const {
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
  } = useConversations();

  const {
    query,
    setQuery,
    querying,
    currentAnswer,
    currentCitations,
    currentSourcesCount,
    handleQuery,
    handleStop,
  } = useStreamQuery(
    currentConversationId,
    currentKnowledgeBaseId,
    searchFilters
  );

  const { webUrl, setWebUrl, extracting, handleExtractWeb } = useWebExtract(
    loadDocs,
    currentKnowledgeBaseId
  );

  const { uploadingPdf, uploadProgress, fileInputRef, handleUploadPdf } =
    usePdfUpload(loadDocs, currentKnowledgeBaseId);

  // 加载对话消息
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId)
        .then((msgs) => {
          setMessages(msgs);
        })
        .catch((error) => {
          console.error("加载对话消息失败:", error);
          setMessages([]);
        });
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversationId]);

  // 当知识库变化时，加载该知识库下的对话
  useEffect(() => {
    if (currentKnowledgeBaseId) {
      loadConversations(currentKnowledgeBaseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKnowledgeBaseId]);

  // 初始化加载
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      loadDocs();
      loadKnowledgeBases();
    }
  }, [user, authLoading, navigate, loadKnowledgeBases]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentAnswer]);

  // 监听 ESC 键取消编辑
  useEffect(() => {
    if (!editingConversationId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelEdit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingConversationId, handleCancelEdit]);

  // 处理查询
  const handleQueryWrapper = async () => {
    // 如果没有选中知识库，提示用户
    if (!currentKnowledgeBaseId) {
      toast.error("请先选择一个知识库");
      return;
    }

    // 如果没有选中对话，先创建一个新对话
    let conversationId = currentConversationId;
    if (!conversationId) {
      const newId = await handleCreateConversation(currentKnowledgeBaseId);
      if (!newId) {
        toast.error("创建对话失败，请稍后重试");
        return;
      }
      conversationId = newId;
      setCurrentConversationId(newId);
      setMessages([]);
      // 重新加载对话列表
      await loadConversations(currentKnowledgeBaseId);
    }

    await handleQuery(messages, setMessages, async () => {
      // 查询完成后重新加载对话消息
      if (conversationId) {
        const updatedMessages = await loadConversationMessages(conversationId);
        setMessages(updatedMessages);
        await loadConversations(currentKnowledgeBaseId);
      } else {
        await loadConversations(currentKnowledgeBaseId);
      }
    }, conversationId);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("已登出");
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background relative">
      {/* 侧边栏 */}
      <Sidebar
        open={sidebarOpen}
        docs={docs}
        loadingDocs={loadingDocs}
        currentKnowledgeBaseId={currentKnowledgeBaseId}
        conversations={conversations}
        loadingConversations={loadingConversations}
        currentConversationId={currentConversationId}
        editingConversationId={editingConversationId}
        editingTitle={editingTitle}
        savingTitle={savingTitle}
        webUrl={webUrl}
        extracting={extracting}
        uploadingPdf={uploadingPdf}
        uploadProgress={uploadProgress}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCreateDoc={handleCreateDoc}
        onDeleteDoc={handleDeleteDoc}
        onWebUrlChange={setWebUrl}
        onExtractWeb={handleExtractWeb}
        onUploadPdf={handleUploadPdf}
        onSelectConversation={async (id) => {
          console.log("选择对话，ID:", id);
          setCurrentConversationId(id);
          // 消息加载由 useEffect 自动处理
        }}
        onCreateConversation={async () => {
          if (!currentKnowledgeBaseId) {
            toast.error("请先选择一个知识库");
            return;
          }
          const newId = await handleCreateConversation(currentKnowledgeBaseId);
          if (newId) {
            setMessages([]);
            setCurrentConversationId(newId);
          }
        }}
        onDeleteConversation={handleDeleteConversation}
        onStartEditTitle={handleStartEditTitle}
        onSaveTitle={handleSaveTitle}
        onCancelEdit={handleCancelEdit}
        onTitleChange={setEditingTitle}
        titleInputRef={titleInputRef}
      />

      {/* 侧边栏切换按钮 */}
      {sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(false)}
          className="absolute left-[248px] top-1/2 -translate-y-1/2 h-8 w-8 rounded-full border bg-background shadow-lg hover:bg-accent hover:shadow-xl z-50 transition-all duration-200"
          aria-label="收起侧边栏"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* 知识库选择器和用户信息 */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <KnowledgeBaseSelector
            knowledgeBases={knowledgeBases}
            loading={loadingKnowledgeBases}
            currentKnowledgeBaseId={currentKnowledgeBaseId}
            onSelect={(id) => {
              setCurrentKnowledgeBaseId(id);
              setCurrentConversationId(null);
              setMessages([]);
            }}
            onCreate={async (name) => {
              try {
                const newKb = await createKnowledgeBase({
                  name,
                  description: null,
                });
                await loadKnowledgeBases();
                setCurrentKnowledgeBaseId(newKb.id);
                toast.success("知识库创建成功");
              } catch (error: any) {
                console.error("创建知识库失败:", error);
                toast.error(error?.message || "创建知识库失败");
              }
            }}
            onUpdate={async (id, name) => {
              await handleUpdateKnowledgeBase(id, name);
            }}
          />
          {/* 用户信息和登出按钮 */}
          <div className="flex items-center gap-3">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user.name || user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              登出
            </Button>
          </div>
        </div>

        {/* 侧边栏切换按钮（当侧边栏隐藏时显示） */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 h-9 w-9 z-10 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {/* 对话消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pt-16">
          <MessageList
            messages={messages}
            querying={querying}
            currentAnswer={currentAnswer}
            currentCitations={currentCitations}
            currentSourcesCount={currentSourcesCount}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* 固定在底部的输入框 */}
        <ChatInput
          query={query}
          querying={querying}
          onQueryChange={setQuery}
          onQuery={handleQueryWrapper}
          onStop={() => handleStop(messages, setMessages)}
        />
      </main>
    </div>
  );
};

export default HomePage;
