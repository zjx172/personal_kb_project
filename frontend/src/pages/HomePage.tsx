import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Input,
  Button,
  List,
  Spin,
  Empty,
  Typography,
  Card,
  Message,
  Divider,
  Popconfirm,
} from "@arco-design/web-react";
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

const { Sider, Content, Header } = Layout;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 网页提取相关
  const [webUrl, setWebUrl] = useState("");
  const [extracting, setExtracting] = useState(false);

  // 知识库搜索相关
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [querying, setQuerying] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<
    QueryResponse["citations"]
  >([]);

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
      // 在新标签页中打开文档编辑页面
      window.open(`/doc/${newDoc.id}`, "_blank");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocClick = (id: string) => {
    navigate(`/doc/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发文档点击
    try {
      await deleteDoc(id);
      Message.success("文档已删除");
      await loadDocs(); // 重新加载文档列表
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "删除失败");
    }
  };

  const handleExtractWeb = async () => {
    if (!webUrl.trim()) {
      Message.warning("请输入网页 URL");
      return;
    }

    // 验证 URL 格式
    try {
      new URL(webUrl);
    } catch {
      Message.error("请输入有效的 URL");
      return;
    }

    setExtracting(true);
    try {
      const newDoc = await extractWebContent({
        url: webUrl,
      });
      Message.success("网页内容已提取并保存");
      setWebUrl("");
      await loadDocs(); // 重新加载文档列表
      // 打开新创建的文档
      window.open(`/doc/${newDoc.id}`, "_blank");
    } catch (e: any) {
      console.error(e);
      Message.error(e?.response?.data?.detail || e?.message || "提取失败");
    } finally {
      setExtracting(false);
    }
  };

  // 匀速显示流式内容
  const startStreamDisplay = () => {
    if (streamTimerRef.current) {
      return; // 已经在运行
    }

    const displayChunk = () => {
      if (streamBufferRef.current.length > 0) {
        // 每次显示 3-5 个字符，根据内容调整
        const chunkSize = Math.min(
          Math.max(3, Math.floor(streamBufferRef.current.length / 20)),
          10
        );
        const chunk = streamBufferRef.current.slice(0, chunkSize);
        streamBufferRef.current = streamBufferRef.current.slice(chunkSize);
        streamDisplayRef.current += chunk;
        setStreamingAnswer(streamDisplayRef.current);

        if (streamBufferRef.current.length > 0) {
          streamTimerRef.current = window.setTimeout(displayChunk, 50); // 每 50ms 显示一次
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
      Message.warning("请输入问题");
      return;
    }

    // 清理之前的定时器
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    setQuerying(true);
    setQueryResult(null);
    setStreamingAnswer("");
    setStreamingCitations([]);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";

    try {
      await queryKnowledgeBaseStream(query, (chunk) => {
        if (chunk.type === "chunk" && chunk.chunk) {
          // 将接收到的 chunk 添加到缓冲区
          streamBufferRef.current += chunk.chunk;
          // 如果定时器没有运行，启动显示
          if (!streamTimerRef.current) {
            startStreamDisplay();
          }
        } else if (chunk.type === "citations" && chunk.citations) {
          // 保存 citations，以便在流式显示时也能使用
          setStreamingCitations(chunk.citations);
        } else if (chunk.type === "final") {
          // 确保所有缓冲内容都显示完
          if (streamBufferRef.current.length > 0) {
            streamDisplayRef.current += streamBufferRef.current;
            streamBufferRef.current = "";
            setStreamingAnswer(streamDisplayRef.current);
          }

          // 清理定时器
          if (streamTimerRef.current) {
            clearTimeout(streamTimerRef.current);
            streamTimerRef.current = null;
          }

          setQueryResult({
            answer: chunk.answer || streamDisplayRef.current,
            citations: chunk.citations || streamingCitations,
          });
          setStreamingAnswer("");
          setStreamingCitations([]);
          streamBufferRef.current = "";
          streamDisplayRef.current = "";
        }
      });
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "搜索失败");
      // 清理定时器
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    } finally {
      setQuerying(false);
    }
  };

  // 组件卸载时清理定时器
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
    <Layout className="h-screen">
      <Header className="h-14 px-4 border-b flex items-center">
        <Typography.Text className="text-lg font-semibold">
          个人学习助手
        </Typography.Text>
      </Header>
      <Layout className="flex-1">
        <Sider width={300} className="border-r p-4">
          <div className="mb-3">
            <Button type="primary" long onClick={handleCreate}>
              新建文档
            </Button>
          </div>
          <div className="mb-3">
            <Input
              placeholder="输入网页 URL..."
              value={webUrl}
              onChange={setWebUrl}
              size="small"
              style={{ marginBottom: 8 }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleExtractWeb();
                }
              }}
            />
            <Button
              type="outline"
              long
              onClick={handleExtractWeb}
              loading={extracting}
            >
              提取网页内容
            </Button>
          </div>
          <div className="text-sm font-semibold mb-2">知识库列表</div>
          <div
            className="overflow-y-auto"
            style={{ height: "calc(100% - 80px)" }}
          >
            <Spin loading={loading} className="w-full">
              {docs.length === 0 ? (
                <Empty description="暂无文档" className="mt-8" />
              ) : (
                <List
                  dataSource={docs}
                  render={(item) => (
                    <List.Item
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50 group"
                      onClick={() => handleDocClick(item.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.title}
                          </div>
                          <div className="flex justify-end mt-1 text-xs text-gray-400">
                            <span>
                              {new Date(item.updated_at).toLocaleDateString(
                                "zh-CN",
                                {
                                  month: "2-digit",
                                  day: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                        <Popconfirm
                          title="确定要删除这个文档吗？"
                          onOk={(e) => handleDelete(item.id, e as any)}
                          onCancel={(e) => e?.stopPropagation()}
                        >
                          <Button
                            type="text"
                            size="mini"
                            status="danger"
                            className="opacity-0 group-hover:opacity-100 ml-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </div>
        </Sider>
        <Content className="flex flex-col items-center justify-center bg-gray-50 p-8">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <Typography.Title heading={2} className="mb-2">
                个人学习助手
              </Typography.Title>
              <Typography.Text type="secondary">
                在您的知识库中搜索答案
              </Typography.Text>
            </div>

            <div className="mb-6">
              <Input
                size="large"
                placeholder="输入您的问题，在知识库中搜索..."
                value={query}
                onChange={setQuery}
                onKeyPress={handleQueryKeyPress}
                style={{
                  height: 56,
                  fontSize: 16,
                }}
                suffix={
                  <Button
                    type="primary"
                    loading={querying}
                    onClick={handleQuery}
                    style={{ marginRight: -8 }}
                  >
                    搜索
                  </Button>
                }
              />
            </div>

            {(queryResult || streamingAnswer || querying) && (
              <Card className="mt-6">
                <div className="mb-4">
                  <Typography.Text className="text-base font-semibold">
                    答案：
                  </Typography.Text>
                </div>
                <div className="mb-4 text-gray-700">
                  {queryResult ? (
                    <AnswerWithCitations
                      answer={queryResult.answer}
                      citations={queryResult.citations}
                    />
                  ) : streamingAnswer ? (
                    <AnswerWithCitations
                      answer={streamingAnswer}
                      citations={streamingCitations}
                    />
                  ) : null}
                  {querying && !streamingAnswer && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                  )}
                </div>

                {queryResult?.citations && queryResult.citations.length > 0 && (
                  <>
                    <Divider />
                    <div className="mb-2">
                      <Typography.Text className="text-sm font-semibold">
                        参考来源：
                      </Typography.Text>
                    </div>
                    <div className="space-y-2">
                      {queryResult.citations.map((citation) => {
                        // 检查是否是 Markdown 文档（格式：markdown_doc:{id}）
                        const isMarkdownDoc =
                          citation.source.startsWith("markdown_doc:");
                        const docId = isMarkdownDoc
                          ? citation.source.replace("markdown_doc:", "")
                          : null;

                        const handleCitationClick = () => {
                          if (docId) {
                            navigate(`/doc/${docId}`);
                          }
                        };

                        return (
                          <Card
                            key={citation.index}
                            size="small"
                            className={`bg-gray-50 ${
                              isMarkdownDoc
                                ? "cursor-pointer hover:bg-gray-100 transition-colors"
                                : ""
                            }`}
                            onClick={
                              isMarkdownDoc ? handleCitationClick : undefined
                            }
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              [{citation.index}] {citation.source}
                              {isMarkdownDoc && (
                                <span className="ml-2 text-blue-500">
                                  (点击打开)
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">
                              {citation.snippet}...
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            )}

            {!queryResult && !streamingAnswer && !querying && (
              <div className="text-center text-gray-400 mt-8">
                <Typography.Text>
                  在知识库中搜索您的问题，或选择左侧文档进行编辑
                </Typography.Text>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HomePage;
