import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Layout,
  Button,
  Input,
  Message,
  Spin,
  Empty,
  Popconfirm,
  Card,
  Typography,
  Divider,
  Tooltip,
} from "@arco-design/web-react";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconList,
  IconOrderedList,
  IconQuote,
  IconLink,
} from "@arco-design/web-react/icon";
import {
  getDoc,
  updateDoc,
  deleteDoc,
  MarkdownDocDetail,
  generateDocSummary,
  recommendDocTags,
  getRelatedDocs,
  RelatedDoc,
  queryKnowledgeBaseStream,
  Citation,
} from "../api";

const { Sider, Content, Header } = Layout;

const DocPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = id || null;
  const highlightTextParam = searchParams.get("highlight");
  const highlightText = highlightTextParam
    ? decodeURIComponent(highlightTextParam)
    : null;

  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDoc[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // 复习知识相关状态
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewCitations, setReviewCitations] = useState<Citation[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "both">("both");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadDoc = async () => {
    if (!docId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getDoc(docId);
      setCurrentDoc(detail);
      setTitleDraft(detail.title);
      setContentDraft(detail.content);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "加载文档失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (docId) {
      loadDoc();
    }
  }, [docId]);

  // 处理高亮文本
  useEffect(() => {
    if (!highlightText || !currentDoc) return;

    const timer = setTimeout(() => {
      const searchText = highlightText.substring(0, 100).trim();
      if (!searchText) return;

      // 在预览区域高亮
      if (previewRef.current) {
        const previewContent = previewRef.current.textContent || "";
        const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapedText, "gi");

        if (regex.test(previewContent)) {
          // 查找并高亮所有匹配的文本节点
          const walker = document.createTreeWalker(
            previewRef.current,
            NodeFilter.SHOW_TEXT,
            null
          );

          const textNodes: Text[] = [];
          let node;
          while ((node = walker.nextNode())) {
            if (node.textContent && regex.test(node.textContent)) {
              textNodes.push(node as Text);
            }
          }

          // 高亮第一个匹配项
          if (textNodes.length > 0) {
            const firstNode = textNodes[0];
            const range = document.createRange();
            const startIndex = firstNode
              .textContent!.toLowerCase()
              .indexOf(searchText.toLowerCase());
            range.setStart(firstNode, startIndex);
            range.setEnd(firstNode, startIndex + searchText.length);

            const mark = document.createElement("mark");
            mark.style.backgroundColor = "#ffeb3b";
            mark.style.padding = "2px 4px";
            mark.style.borderRadius = "2px";
            mark.style.fontWeight = "500";
            try {
              range.surroundContents(mark);
              mark.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            } catch (e) {
              // 如果 surroundContents 失败，尝试在编辑器中定位
              if (editorRef.current) {
                const editorContent = editorRef.current.value;
                const index = editorContent
                  .toLowerCase()
                  .indexOf(searchText.toLowerCase());
                if (index !== -1) {
                  editorRef.current.setSelectionRange(
                    index,
                    index + searchText.length
                  );
                  editorRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }
            }
          }
        }
      } else if (editorRef.current) {
        // 如果在预览中找不到，尝试在编辑器中定位
        const editorContent = editorRef.current.value;
        const index = editorContent
          .toLowerCase()
          .indexOf(searchText.toLowerCase());
        if (index !== -1) {
          editorRef.current.setSelectionRange(index, index + searchText.length);
          editorRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [highlightText, currentDoc]);

  // 自动保存函数（防抖）
  const triggerAutoSave = (content: string) => {
    if (!docId) return;

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 设置新的定时器，2秒后自动保存
    saveTimerRef.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        const detail = await updateDoc(docId, {
          title: titleDraft,
          content: content,
        });
        setCurrentDoc(detail);
        setLastSaved(new Date());
        // 静默保存，不显示成功消息
      } catch (e: any) {
        console.error(e);
        Message.error("自动保存失败");
      } finally {
        setSaving(false);
      }
    }, 2000); // 2秒延迟
  };

  // 处理内容变化
  const handleContentChange = (value: string) => {
    setContentDraft(value);
    triggerAutoSave(value);
  };

  // 格式化工具函数
  const insertText = (before: string, after: string = "") => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contentDraft.substring(start, end);
    const newText =
      contentDraft.substring(0, start) +
      before +
      selectedText +
      after +
      contentDraft.substring(end);
    setContentDraft(newText);
    triggerAutoSave(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // 工具栏按钮处理
  const handleFormat = (type: string) => {
    switch (type) {
      case "bold":
        insertText("**", "**");
        break;
      case "italic":
        insertText("*", "*");
        break;
      case "strikethrough":
        insertText("~~", "~~");
        break;
      case "code":
        insertText("`", "`");
        break;
      case "codeBlock":
        insertText("```\n", "\n```");
        break;
      case "quote":
        insertText("> ", "");
        break;
      case "heading":
        insertText("# ", "");
        break;
      case "ul":
        insertText("- ", "");
        break;
      case "ol":
        insertText("1. ", "");
        break;
      case "link":
        insertText("[", "]()");
        setTimeout(() => {
          if (editorRef.current) {
            const pos = editorRef.current.selectionStart - 1;
            editorRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
        break;
      default:
        break;
    }
  };

  // 监听标题变化，也触发自动保存
  useEffect(() => {
    if (currentDoc && docId && titleDraft !== currentDoc.title) {
      // 清除之前的定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // 设置新的定时器，2秒后自动保存
      saveTimerRef.current = window.setTimeout(async () => {
        setSaving(true);
        try {
          const detail = await updateDoc(docId, {
            title: titleDraft,
            content: contentDraft,
          });
          setCurrentDoc(detail);
          setLastSaved(new Date());
        } catch (e: any) {
          console.error(e);
          Message.error("自动保存失败");
        } finally {
          setSaving(false);
        }
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleDraft]);

  const handleManualSave = async () => {
    if (!docId) return;

    // 清除自动保存定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaving(true);
    setError(null);
    try {
      const detail = await updateDoc(docId, {
        title: titleDraft,
        content: contentDraft,
      });
      setCurrentDoc(detail);
      setLastSaved(new Date());
      Message.success("保存成功");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存失败");
      Message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // 加载相关文档
  const loadRelatedDocs = async (docId: string) => {
    setLoadingRelated(true);
    try {
      const result = await getRelatedDocs(docId, 5);
      setRelatedDocs(result.related_docs);
    } catch (e) {
      console.error("加载相关文档失败:", e);
    } finally {
      setLoadingRelated(false);
    }
  };

  // 手动生成摘要
  const handleGenerateSummary = async () => {
    if (!docId) return;
    try {
      const result = await generateDocSummary(docId);
      Message.success("摘要生成成功");
      await loadDoc(); // 重新加载文档
    } catch (e: any) {
      Message.error(e?.message || "生成摘要失败");
    }
  };

  // 手动推荐标签
  const handleRecommendTags = async () => {
    if (!docId) return;
    try {
      const result = await recommendDocTags(docId);
      Message.success("标签推荐成功");
      await loadDoc(); // 重新加载文档
    } catch (e: any) {
      Message.error(e?.message || "推荐标签失败");
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    try {
      await deleteDoc(docId);
      Message.success("文档已删除");
      navigate("/"); // 删除后返回主页
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "删除失败");
    }
  };

  // 复习知识功能
  const handleReviewQuery = async () => {
    if (!reviewQuery.trim()) {
      Message.warning("请输入问题");
      return;
    }

    setReviewing(true);
    setReviewAnswer("");
    setReviewCitations([]);
    setShowReviewPanel(true);

    try {
      await queryKnowledgeBaseStream(
        reviewQuery,
        (chunk) => {
          if (chunk.type === "chunk" && chunk.chunk) {
            setReviewAnswer((prev) => prev + chunk.chunk);
          } else if (chunk.type === "citations" && chunk.citations) {
            setReviewCitations(chunk.citations);
          } else if (chunk.type === "final") {
            if (chunk.answer) {
              setReviewAnswer(chunk.answer);
            }
            if (chunk.citations) {
              setReviewCitations(chunk.citations);
            }
          }
        },
        {
          k: 5, // 初始检索5个
          rerank_k: 3, // 只返回最相关的3个结果
        }
      );
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "搜索失败");
      setReviewAnswer("搜索失败，请稍后重试");
    } finally {
      setReviewing(false);
    }
  };

  // 处理搜索结果点击，跳转到对应文档并高亮
  const handleCitationClick = (citation: Citation) => {
    const isMarkdownDoc = citation.source.startsWith("markdown_doc:");
    const docId = isMarkdownDoc
      ? citation.source.replace("markdown_doc:", "")
      : null;

    if (docId && citation.snippet) {
      // 跳转到文档页面，并传递高亮信息
      const highlightParam = encodeURIComponent(
        citation.snippet.substring(0, 100)
      );
      navigate(`/doc/${docId}?highlight=${highlightParam}`);
    } else if (docId) {
      navigate(`/doc/${docId}`);
    }
  };

  // 检查答案是否表示找不到相关内容
  const isNoAnswerFound = (answer: string): boolean => {
    const lowerAnswer = answer.toLowerCase();
    return (
      lowerAnswer.includes("知识库中没有相关内容") ||
      lowerAnswer.includes("没有找到") ||
      lowerAnswer.includes("找不到") ||
      lowerAnswer.includes("未找到") ||
      (lowerAnswer.includes("没有") && lowerAnswer.includes("信息")) ||
      reviewCitations.length === 0
    );
  };

  if (!docId) {
    return (
      <Layout className="h-screen">
        <Content className="flex items-center justify-center">
          <Empty description="文档 ID 无效" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="h-screen">
      <Header className="h-14 px-4 border-b flex items-center justify-between">
        <Button type="text" onClick={() => navigate("/")}>
          ← 返回
        </Button>
        <div className="flex items-center gap-2">
          <Input
            placeholder="文档标题"
            value={titleDraft}
            onChange={setTitleDraft}
            style={{ width: 200 }}
            size="small"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="outline"
            size="small"
            onClick={() => setShowReviewPanel(!showReviewPanel)}
          >
            {showReviewPanel ? "隐藏" : "复习知识"}
          </Button>
          {saving && <span className="text-xs text-gray-400">保存中...</span>}
          {lastSaved && !saving && (
            <span className="text-xs text-gray-400">
              已保存：{lastSaved.toLocaleTimeString()}
            </span>
          )}
          {!lastSaved && currentDoc && !saving && (
            <span className="text-xs text-gray-400">
              最后保存：
              {new Date(currentDoc.updated_at).toLocaleString()}
            </span>
          )}
          <Button
            type="primary"
            size="small"
            onClick={handleManualSave}
            loading={saving}
          >
            手动保存
          </Button>
          <Popconfirm
            title="确定要删除这个文档吗？"
            onOk={handleDelete}
            okButtonProps={{ status: "danger" }}
          >
            <Button type="outline" size="small" status="danger">
              删除
            </Button>
          </Popconfirm>
        </div>
      </Header>

      {error && (
        <div className="px-4 py-2">
          <Message type="error" content={error} />
        </div>
      )}

      <Layout className="flex-1 overflow-hidden">
        <Content className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Spin />
            </div>
          ) : !currentDoc ? (
            <div className="h-full flex items-center justify-center">
              <Empty description="文档不存在" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 工具栏 */}
              <div className="border-b bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 border-r pr-2 mr-2">
                  <Tooltip content="粗体">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconBold />}
                      onClick={() => handleFormat("bold")}
                    />
                  </Tooltip>
                  <Tooltip content="斜体">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconItalic />}
                      onClick={() => handleFormat("italic")}
                    />
                  </Tooltip>
                  <Tooltip content="删除线">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconStrikethrough />}
                      onClick={() => handleFormat("strikethrough")}
                    />
                  </Tooltip>
                  <Tooltip content="行内代码">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconCode />}
                      onClick={() => handleFormat("code")}
                    />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1 border-r pr-2 mr-2">
                  <Tooltip content="标题">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleFormat("heading")}
                    >
                      H
                    </Button>
                  </Tooltip>
                  <Tooltip content="引用">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconQuote />}
                      onClick={() => handleFormat("quote")}
                    />
                  </Tooltip>
                  <Tooltip content="无序列表">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconList />}
                      onClick={() => handleFormat("ul")}
                    />
                  </Tooltip>
                  <Tooltip content="有序列表">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconOrderedList />}
                      onClick={() => handleFormat("ol")}
                    />
                  </Tooltip>
                  <Tooltip content="链接">
                    <Button
                      type="text"
                      size="small"
                      icon={<IconLink />}
                      onClick={() => handleFormat("link")}
                    />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <Button
                    type={viewMode === "edit" ? "primary" : "text"}
                    size="small"
                    onClick={() => setViewMode("edit")}
                  >
                    编辑
                  </Button>
                  <Button
                    type={viewMode === "preview" ? "primary" : "text"}
                    size="small"
                    onClick={() => setViewMode("preview")}
                  >
                    预览
                  </Button>
                  <Button
                    type={viewMode === "both" ? "primary" : "text"}
                    size="small"
                    onClick={() => setViewMode("both")}
                  >
                    分屏
                  </Button>
                </div>
              </div>

              {/* 编辑器区域 */}
              <div className="flex-1 flex overflow-hidden">
                {(viewMode === "edit" || viewMode === "both") && (
                  <div
                    className={`${
                      viewMode === "both" ? "w-1/2" : "w-full"
                    } flex flex-col border-r`}
                  >
                    <textarea
                      ref={editorRef}
                      value={contentDraft}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="flex-1 w-full p-6 resize-none outline-none text-sm leading-relaxed bg-white"
                      placeholder="开始输入...支持 Markdown 语法"
                      style={{
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
                        color: "#1f2329",
                        fontSize: "14px",
                        lineHeight: "1.75",
                      }}
                    />
                  </div>
                )}
                {(viewMode === "preview" || viewMode === "both") && (
                  <div
                    ref={previewRef}
                    className={`${
                      viewMode === "both" ? "w-1/2" : "w-full"
                    } overflow-y-auto p-6 bg-white`}
                    style={{
                      maxWidth: viewMode === "both" ? "100%" : "900px",
                      margin: viewMode === "both" ? "0" : "0 auto",
                    }}
                  >
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code: ({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }: any) => {
                            const match = /language-(\w+)/.exec(
                              className || ""
                            );
                            return !inline && match ? (
                              <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code
                                className="bg-gray-100 px-1.5 py-0.5 rounded text-sm"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {contentDraft || "*暂无内容*"}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Content>

        {/* 复习知识侧边栏 */}
        {showReviewPanel && (
          <div
            className="w-96 border-l bg-white overflow-y-auto"
            style={{ height: "calc(100vh - 56px)" }}
          >
            <div className="p-4">
              <Typography.Title heading={6} className="mb-4">
                复习知识
              </Typography.Title>
              <div className="mb-4">
                <Input
                  placeholder="输入问题，在知识库中查找答案..."
                  value={reviewQuery}
                  onChange={setReviewQuery}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReviewQuery();
                    }
                  }}
                  suffix={
                    <Button
                      type="primary"
                      size="small"
                      loading={reviewing}
                      onClick={handleReviewQuery}
                    >
                      搜索
                    </Button>
                  }
                />
              </div>

              {/* 搜索结果 */}
              {(reviewAnswer || reviewing) && (
                <div className="mt-4">
                  {reviewing && !reviewAnswer && (
                    <div className="flex items-center justify-center py-8">
                      <Spin />
                      <span className="ml-3 text-gray-500">正在搜索...</span>
                    </div>
                  )}

                  {reviewAnswer && (
                    <>
                      {/* 答案部分 */}
                      <Card className="mb-4">
                        <Typography.Text className="text-sm font-semibold text-gray-700 mb-2 block">
                          AI 回答：
                        </Typography.Text>
                        <div className="text-sm text-gray-800 leading-relaxed">
                          {isNoAnswerFound(reviewAnswer) ? (
                            <div className="text-orange-600">
                              <Typography.Text type="warning">
                                知识库中没有找到相关内容
                              </Typography.Text>
                            </div>
                          ) : (
                            <div
                              dangerouslySetInnerHTML={{
                                __html: reviewAnswer.replace(
                                  /\[(\d+)\]/g,
                                  '<span class="text-blue-600 font-medium">[$1]</span>'
                                ),
                              }}
                            />
                          )}
                          {reviewing && (
                            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                          )}
                        </div>
                      </Card>

                      {/* 引用来源 */}
                      {reviewCitations.length > 0 &&
                        !isNoAnswerFound(reviewAnswer) && (
                          <div>
                            <Typography.Text className="text-sm font-semibold text-gray-700 mb-2 block">
                              相关来源：
                            </Typography.Text>
                            <div className="space-y-3">
                              {reviewCitations.map((citation) => {
                                const isMarkdownDoc =
                                  citation.source.startsWith("markdown_doc:");
                                const docId = isMarkdownDoc
                                  ? citation.source.replace("markdown_doc:", "")
                                  : null;

                                return (
                                  <Card
                                    key={citation.index}
                                    hoverable={!!docId}
                                    className={`cursor-pointer transition-all ${
                                      docId
                                        ? "hover:shadow-md hover:border-blue-400"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleCitationClick(citation)
                                    }
                                  >
                                    <div className="flex flex-col">
                                      {/* 标题 */}
                                      {citation.title && (
                                        <div className="mb-1">
                                          <Typography.Text
                                            className={`text-base font-normal leading-snug ${
                                              docId
                                                ? "text-blue-600 hover:underline"
                                                : "text-gray-800"
                                            }`}
                                          >
                                            {citation.title}
                                          </Typography.Text>
                                        </div>
                                      )}

                                      {/* 来源 */}
                                      <div className="mb-1 flex items-center gap-2 text-xs">
                                        <span className="text-green-700 font-normal">
                                          {isMarkdownDoc
                                            ? citation.title || "知识库文档"
                                            : citation.source
                                                .split("/")
                                                .pop() || citation.source}
                                        </span>
                                        {isMarkdownDoc && (
                                          <>
                                            <span className="text-gray-400">
                                              •
                                            </span>
                                            <span className="text-gray-500">
                                              知识库文档
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* 摘要内容 */}
                                      <div className="text-sm text-gray-700 leading-relaxed mt-1">
                                        <span className="line-clamp-3">
                                          {citation.snippet}
                                        </span>
                                        {citation.snippet.length > 150 && (
                                          <span className="text-gray-500">
                                            ...
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}

              {!reviewAnswer && !reviewing && (
                <div className="text-center text-gray-400 mt-8">
                  <Typography.Text>
                    输入问题，在知识库中查找准确的答案
                  </Typography.Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Layout>
    </Layout>
  );
};

export default DocPage;
