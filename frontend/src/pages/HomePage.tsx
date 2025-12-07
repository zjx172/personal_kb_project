import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { SearchFilterOptions } from "../components/SearchFilters";
import { Message } from "../types/chat";
import { useConversations } from "../hooks/useConversations";
import { useDocs } from "../hooks/useDocs";
import { useStreamQuery } from "../hooks/useStreamQuery";
import { useWebExtract } from "../hooks/useWebExtract";
import { usePdfUpload } from "../hooks/usePdfUpload";
import { Sidebar } from "../components/home/Sidebar";
import { MessageList } from "../components/home/MessageList";
import { ChatInput } from "../components/home/ChatInput";
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
    docs,
    loading: loadingDocs,
    loadDocs,
    handleCreate: handleCreateDoc,
    handleDelete: handleDeleteDoc,
  } = useDocs();

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
  } = useStreamQuery(currentConversationId, searchFilters);

  const { webUrl, setWebUrl, extracting, handleExtractWeb } =
    useWebExtract(loadDocs);

  const { uploadingPdf, fileInputRef, handleUploadPdf } =
    usePdfUpload(loadDocs);

  // 加载对话消息
  useEffect(() => {
    if (currentConversationId) {
      loadConversationMessages(currentConversationId).then((msgs) => {
        setMessages(msgs);
      });
    } else {
      setMessages([]);
    }
  }, [currentConversationId]);

  // 初始化加载
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      loadDocs();
      loadConversations();
    }
  }, [user, authLoading, navigate]);

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
    await handleQuery(messages, setMessages, async () => {
      // 查询完成后重新加载对话消息
      if (currentConversationId) {
        const updatedMessages = await loadConversationMessages(
          currentConversationId
        );
        setMessages(updatedMessages);
        await loadConversations();
      } else {
        await loadConversations();
      }
    });
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
        conversations={conversations}
        loadingConversations={loadingConversations}
        currentConversationId={currentConversationId}
        editingConversationId={editingConversationId}
        editingTitle={editingTitle}
        savingTitle={savingTitle}
        webUrl={webUrl}
        extracting={extracting}
        uploadingPdf={uploadingPdf}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCreateDoc={handleCreateDoc}
        onDeleteDoc={handleDeleteDoc}
        onWebUrlChange={setWebUrl}
        onExtractWeb={handleExtractWeb}
        onUploadPdf={handleUploadPdf}
        onSelectConversation={async (id) => {
          await handleSelectConversation(id);
          const msgs = await loadConversationMessages(id);
          setMessages(msgs);
        }}
        onCreateConversation={async () => {
          const newId = await handleCreateConversation();
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
        {/* 用户信息和登出按钮 */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
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
        <div className="flex-1 overflow-y-auto px-4 py-6">
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
