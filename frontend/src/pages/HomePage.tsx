import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  listDocs,
  createDoc,
  deleteDoc,
  MarkdownDocItem,
  queryKnowledgeBaseStream,
  QueryResponse,
  extractWebContent,
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  updateConversation,
  Conversation,
  ConversationDetail,
  SearchHistoryItem,
} from "../api";
import { AnswerWithCitations } from "../components/AnswerWithCitations";
import { SearchFilterOptions } from "../components/SearchFilters";
import { useAuth } from "../contexts/AuthContext";
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Loader2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  User,
  Clock,
  X,
  Send,
  Square,
  ChevronDown,
} from "lucide-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 网页提取相关
  const [webUrl, setWebUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  // 对话消息类型
  interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations?: QueryResponse["citations"];
    sourcesCount?: number;
    timestamp: Date;
  }

  // 知识库搜索相关
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentCitations, setCurrentCitations] = useState<
    QueryResponse["citations"]
  >([]);
  const [currentSourcesCount, setCurrentSourcesCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState<SearchFilterOptions>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 流式显示控制
  const streamBufferRef = useRef<string>("");
  const streamTimerRef = useRef<number | null>(null);
  const streamDisplayRef = useRef<string>("");

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

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const convs = await listConversations();
      setConversations(convs);

      // 如果有对话但没有当前对话，选择最新的对话
      if (convs.length > 0 && !currentConversationId) {
        setCurrentConversationId(convs[0].id);
        await loadConversationMessages(convs[0].id);
      } else if (currentConversationId) {
        await loadConversationMessages(currentConversationId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
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
      setMessages(conversationMessages);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConv = await createConversation();
      setCurrentConversationId(newConv.id);
      setMessages([]);
      await loadConversations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "创建对话失败");
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadConversationMessages(conversationId);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      toast.success("对话已删除");

      // 如果删除的是当前对话，切换到其他对话或创建新对话
      if (conversationId === currentConversationId) {
        const remaining = conversations.filter((c) => c.id !== conversationId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
          await loadConversationMessages(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }

      await loadConversations();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "删除对话失败");
    }
  };

  useEffect(() => {
    // 检查认证状态
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

  const handleDocClick = (id: string) => {
    navigate(`/doc/${id}`);
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
      });
      toast.success("网页内容已提取并保存");
      setWebUrl("");
      await loadDocs();
      window.open(`/doc/${newDoc.id}`, "_blank");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.detail || e?.message || "提取失败");
    } finally {
      setExtracting(false);
    }
  };

  // 匀速显示流式内容
  const startStreamDisplay = () => {
    if (streamTimerRef.current) {
      return;
    }

    const displayChunk = () => {
      if (streamBufferRef.current.length > 0) {
        const chunkSize = Math.min(
          Math.max(3, Math.floor(streamBufferRef.current.length / 20)),
          10
        );
        const chunk = streamBufferRef.current.slice(0, chunkSize);
        streamBufferRef.current = streamBufferRef.current.slice(chunkSize);
        streamDisplayRef.current += chunk;
        setCurrentAnswer(streamDisplayRef.current);

        if (streamBufferRef.current.length > 0) {
          streamTimerRef.current = window.setTimeout(displayChunk, 50);
        } else {
          streamTimerRef.current = null;
        }
      } else {
        streamTimerRef.current = null;
      }
    };

    displayChunk();
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setQuerying(false);

    // 将当前答案保存到消息列表
    if (currentAnswer.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: currentAnswer,
        citations: currentCitations,
        sourcesCount: currentSourcesCount,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
    }

    setCurrentAnswer("");
    setCurrentCitations([]);
    setCurrentSourcesCount(0);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      toast.warning("请输入问题");
      return;
    }

    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    const currentQuery = query;
    setQuery("");
    setQuerying(true);
    setCurrentAnswer("");
    setCurrentCitations([]);
    setCurrentSourcesCount(0);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";

    // 创建 AbortController 用于停止请求
    const controller = new AbortController();
    setAbortController(controller);

    try {
      let finalAnswer = "";
      let finalCitations: QueryResponse["citations"] = [];
      let finalSourcesCount = 0;

      await queryKnowledgeBaseStream(
        currentQuery,
        (chunk) => {
          if (chunk.type === "chunk" && chunk.chunk) {
            streamBufferRef.current += chunk.chunk;
            if (!streamTimerRef.current) {
              startStreamDisplay();
            }
          } else if (chunk.type === "citations" && chunk.citations) {
            setCurrentCitations(chunk.citations);
            setCurrentSourcesCount(chunk.citations.length);
            finalCitations = chunk.citations;
            finalSourcesCount = chunk.citations.length;
          } else if (chunk.type === "final") {
            if (streamBufferRef.current.length > 0) {
              streamDisplayRef.current += streamBufferRef.current;
              streamBufferRef.current = "";
              setCurrentAnswer(streamDisplayRef.current);
            }

            if (chunk.answer) {
              finalAnswer = chunk.answer;
              setCurrentAnswer(chunk.answer);
            } else if (streamDisplayRef.current) {
              finalAnswer = streamDisplayRef.current;
            }

            if (chunk.citations) {
              finalCitations = chunk.citations;
              finalSourcesCount = chunk.citations.length;
              setCurrentCitations(chunk.citations);
              setCurrentSourcesCount(chunk.citations.length);
            }

            if (streamTimerRef.current) {
              clearTimeout(streamTimerRef.current);
              streamTimerRef.current = null;
            }

            streamBufferRef.current = "";
          }
        },
        {
          ...searchFilters,
          conversation_id: currentConversationId || undefined,
        }
      );

      // 等待流式显示完成（最多等待2秒）
      let waitCount = 0;
      while (
        (streamTimerRef.current || streamBufferRef.current.length > 0) &&
        waitCount < 20
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitCount++;
      }

      // 搜索完成后，重新加载当前对话的消息
      if (currentConversationId) {
        await loadConversationMessages(currentConversationId);
        await loadConversations(); // 更新对话列表（更新时间）
      } else {
        // 如果没有当前对话，重新加载对话列表（会创建新对话）
        await loadConversations();
      }
    } catch (e: any) {
      console.error(e);
      if (e.name !== "AbortError") {
        toast.error(e?.message || "搜索失败");
        // 添加错误消息
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "抱歉，搜索过程中出现了错误。请稍后重试。",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    } finally {
      setQuerying(false);
      setAbortController(null);
      setCurrentAnswer("");
      setCurrentCitations([]);
      setCurrentSourcesCount(0);
      streamBufferRef.current = "";
      streamDisplayRef.current = "";
    }
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
      }
    };
  }, []);

  const handleQueryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
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
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } border-r bg-card flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className={`${sidebarOpen ? "p-4" : "p-0"} space-y-4`}>
          {sidebarOpen && (
            <>
              <Button onClick={handleCreate} className="w-full" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新建文档
              </Button>

              <div className="space-y-2">
                <Input
                  placeholder="输入网页 URL..."
                  value={webUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setWebUrl(e.target.value)
                  }
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      handleExtractWeb();
                    }
                  }}
                  className="h-9"
                />
                <Button
                  variant="outline"
                  onClick={handleExtractWeb}
                  disabled={extracting}
                  className="w-full"
                  size="sm"
                >
                  {extracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="mr-2 h-4 w-4" />
                  )}
                  提取网页
                </Button>
              </div>

              <div className="text-sm font-semibold text-muted-foreground pt-2">
                知识库
              </div>
            </>
          )}
        </div>

        <div
          className={`flex-1 overflow-y-auto ${
            sidebarOpen ? "px-4 pb-4" : "px-0 pb-0"
          }`}
        >
          {sidebarOpen && (
            <>
              {/* 对话列表 */}
              <div className="space-y-1 mb-4">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-4">
                    暂无对话
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors ${
                        currentConversationId === conv.id ? "bg-accent" : ""
                      }`}
                    >
                      <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {conv.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(conv.updated_at).toLocaleDateString(
                              "zh-CN",
                              {
                                month: "2-digit",
                                day: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              确定要删除这个对话吗？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              此操作无法撤销，对话及其所有消息将被永久删除。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteConversation(conv.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t my-2" />

              {/* 文档列表 */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : docs.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  暂无文档
                </div>
              ) : (
                <div className="space-y-1">
                  {docs.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div
                        className="flex items-center gap-2 flex-1 min-w-0"
                        onClick={() => handleDocClick(item.id)}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.updated_at).toLocaleDateString(
                              "zh-CN",
                              {
                                month: "2-digit",
                                day: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              确定要删除这个文档吗？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              此操作无法撤销，文档将被永久删除。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* 侧边栏切换按钮 - 在侧边栏右边缘（放在侧边栏外面避免被 overflow-hidden 裁剪） */}
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

      {/* 主内容区 - 聊天式布局 */}
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
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* 空状态 - 只在没有消息时显示 */}
            {messages.length === 0 && !querying && (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <h1 className="text-4xl font-bold tracking-tight mb-3">
                  个人知识库
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  在您的知识库中搜索答案，或创建新文档
                </p>
                {conversations.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    点击左侧"新建对话"开始对话
                  </p>
                )}
              </div>
            )}

            {/* 显示对话消息 */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
                <div
                  className={`flex flex-col gap-2 max-w-[80%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">AI 助手</span>
                      {message.sourcesCount !== undefined &&
                        message.sourcesCount > 0 && (
                          <div className="flex items-center gap-1">
                            <ChevronDown className="h-3 w-3" />
                            <span>浏览了 {message.sourcesCount} 个来源</span>
                          </div>
                        )}
                    </div>
                  )}
                  <Card
                    className={`${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    <CardContent className="p-4">
                      {message.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <AnswerWithCitations
                            answer={message.content}
                            citations={message.citations || []}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* 当前正在生成的答案 */}
            {querying && (
              <div className="flex gap-4 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="flex flex-col gap-2 max-w-[80%] items-start">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">AI 助手</span>
                    {currentSourcesCount > 0 && (
                      <div className="flex items-center gap-1">
                        <ChevronDown className="h-3 w-3" />
                        <span>浏览了 {currentSourcesCount} 个来源</span>
                      </div>
                    )}
                  </div>
                  <Card className="bg-card">
                    <CardContent className="p-4">
                      <div className="prose prose-sm max-w-none">
                        {currentAnswer ? (
                          <AnswerWithCitations
                            answer={currentAnswer}
                            citations={currentCitations}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-muted-foreground">
                              正在思考...
                            </span>
                          </div>
                        )}
                        {currentAnswer && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 固定在底部的输入框 */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="w-full max-w-4xl mx-auto px-4 py-4">
            <div className="relative group">
              <Input
                placeholder="问任何问题, /提示"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                onKeyPress={handleQueryKeyPress}
                className="pl-4 pr-24 h-12 text-base focus-visible:shadow-md focus-visible:shadow-primary/10"
                disabled={querying}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {querying && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStop}
                    className="h-8"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    停止生成
                  </Button>
                )}
                <Button
                  onClick={handleQuery}
                  disabled={querying || !query.trim()}
                  size="sm"
                  className="h-8"
                >
                  {querying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
