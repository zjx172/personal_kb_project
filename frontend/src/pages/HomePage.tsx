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
} from "../api";
import { AnswerWithCitations } from "../components/AnswerWithCitations";
import { SearchFilterOptions } from "../components/SearchFilters";
import { Plus, Search, FileText, Trash2, Loader2, Globe } from "lucide-react";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 网页提取相关
  const [webUrl, setWebUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  // 知识库搜索相关
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<
    QueryResponse["citations"]
  >([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilterOptions>({});

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

  useEffect(() => {
    loadDocs();
  }, []);

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
        setStreamingAnswer(streamDisplayRef.current);

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

  const handleQuery = async () => {
    if (!query.trim()) {
      toast.warning("请输入问题");
      return;
    }

    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    setQuerying(true);
    setStreamingAnswer("");
    setStreamingCitations([]);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";

    try {
      await queryKnowledgeBaseStream(
        query,
        (chunk) => {
          if (chunk.type === "chunk" && chunk.chunk) {
            streamBufferRef.current += chunk.chunk;
            if (!streamTimerRef.current) {
              startStreamDisplay();
            }
          } else if (chunk.type === "citations" && chunk.citations) {
            setStreamingCitations(chunk.citations);
          } else if (chunk.type === "final") {
            if (streamBufferRef.current.length > 0) {
              streamDisplayRef.current += streamBufferRef.current;
              streamBufferRef.current = "";
              setStreamingAnswer(streamDisplayRef.current);
            }

            if (chunk.answer) {
              setStreamingAnswer(chunk.answer);
            }

            if (chunk.citations) {
              setStreamingCitations(chunk.citations);
            }

            if (streamTimerRef.current) {
              clearTimeout(streamTimerRef.current);
              streamTimerRef.current = null;
            }

            streamBufferRef.current = "";
          }
        },
        searchFilters
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "搜索失败");
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    } finally {
      setQuerying(false);
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

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 space-y-4">
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
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                  onClick={() => handleDocClick(item.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.updated_at).toLocaleDateString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
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
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl">
          {/* 标题区域 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-3">
              个人知识库
            </h1>
            <p className="text-lg text-muted-foreground">
              在您的知识库中搜索答案，或创建新文档
            </p>
          </div>

          {/* 搜索框 */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="输入您的问题，在知识库中搜索..."
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setQuery(e.target.value)
                }
                onKeyPress={handleQueryKeyPress}
                className="pl-12 pr-24 h-14 text-base"
              />
              <Button
                onClick={handleQuery}
                disabled={querying}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                size="sm"
              >
                {querying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "搜索"
                )}
              </Button>
            </div>
          </div>

          {/* 搜索结果 */}
          {(streamingAnswer || querying) && (
            <div className="space-y-6">
              {streamingAnswer && (
                <Card className="border-2">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <h2 className="text-lg font-semibold">AI 回答</h2>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <AnswerWithCitations
                        answer={streamingAnswer}
                        citations={streamingCitations}
                      />
                      {querying && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {querying && !streamingAnswer && (
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-muted-foreground">正在搜索...</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 空状态 */}
          {!streamingAnswer && !querying && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                在知识库中搜索您的问题，或选择左侧文档进行编辑
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
