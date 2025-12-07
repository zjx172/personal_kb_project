import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { markdownToHtml } from "../utils/markdown";
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

  // 格式化工具函数 - 改进版，支持选中文字格式化
  const insertText = (
    before: string,
    after: string = "",
    wrapSelected: boolean = true
  ) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contentDraft.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText && wrapSelected) {
      // 如果有选中文字，用格式包裹选中文字
      newText =
        contentDraft.substring(0, start) +
        before +
        selectedText +
        after +
        contentDraft.substring(end);
      // 光标放在格式标记之后
      newCursorPos = start + before.length + selectedText.length + after.length;
    } else {
      // 如果没有选中文字，插入格式标记，光标在中间
      newText =
        contentDraft.substring(0, start) +
        before +
        after +
        contentDraft.substring(end);
      newCursorPos = start + before.length;
    }

    setContentDraft(newText);
    triggerAutoSave(newText);

    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 工具栏按钮处理 - 改进版，支持选中文字格式化
  const handleFormat = (type: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contentDraft.substring(start, end);

    switch (type) {
      case "bold":
        if (selectedText) {
          // 如果选中了文字，检查是否已经是粗体格式
          if (selectedText.startsWith("**") && selectedText.endsWith("**")) {
            // 移除粗体格式
            const unformatted = selectedText.slice(2, -2);
            insertTextAtPosition(start, end, unformatted);
          } else {
            // 添加粗体格式
            insertText("**", "**");
          }
        } else {
          insertText("**", "**");
        }
        break;
      case "italic":
        if (selectedText) {
          // 检查是否已经是斜体格式
          if (
            (selectedText.startsWith("*") &&
              selectedText.endsWith("*") &&
              !selectedText.startsWith("**")) ||
            (selectedText.startsWith("_") && selectedText.endsWith("_"))
          ) {
            // 移除斜体格式
            const unformatted = selectedText.replace(/^[*_]|[*_]$/g, "");
            insertTextAtPosition(start, end, unformatted);
          } else {
            insertText("*", "*");
          }
        } else {
          insertText("*", "*");
        }
        break;
      case "strikethrough":
        if (selectedText) {
          if (selectedText.startsWith("~~") && selectedText.endsWith("~~")) {
            const unformatted = selectedText.slice(2, -2);
            insertTextAtPosition(start, end, unformatted);
          } else {
            insertText("~~", "~~");
          }
        } else {
          insertText("~~", "~~");
        }
        break;
      case "code":
        if (selectedText) {
          if (selectedText.startsWith("`") && selectedText.endsWith("`")) {
            const unformatted = selectedText.slice(1, -1);
            insertTextAtPosition(start, end, unformatted);
          } else {
            insertText("`", "`");
          }
        } else {
          insertText("`", "`");
        }
        break;
      case "highlight":
        if (selectedText) {
          if (selectedText.startsWith("==") && selectedText.endsWith("==")) {
            const unformatted = selectedText.slice(2, -2);
            insertTextAtPosition(start, end, unformatted);
          } else {
            insertText("==", "==");
          }
        } else {
          insertText("==", "==");
        }
        break;
      case "codeBlock":
        insertText("```\n", "\n```", false);
        break;
      case "quote":
        if (selectedText) {
          // 如果选中了多行，给每行添加引用标记
          const lines = selectedText.split("\n");
          const quotedLines = lines.map((line) => `> ${line}`).join("\n");
          insertTextAtPosition(start, end, quotedLines);
        } else {
          insertText("> ", "");
        }
        break;
      case "heading":
        if (selectedText && selectedText.match(/^#{1,6} /)) {
          // 如果已经是标题，移除标题标记
          const unformatted = selectedText.replace(/^#{1,6} /, "");
          insertTextAtPosition(start, end, unformatted);
        } else {
          insertText("# ", "");
        }
        break;
      case "ul":
        if (selectedText) {
          const lines = selectedText.split("\n");
          const listLines = lines
            .map((line) => (line.trim() ? `- ${line.trim()}` : line))
            .join("\n");
          insertTextAtPosition(start, end, listLines);
        } else {
          insertText("- ", "");
        }
        break;
      case "ol":
        if (selectedText) {
          const lines = selectedText.split("\n");
          let counter = 1;
          const listLines = lines
            .map((line) => {
              if (line.trim()) {
                return `${counter++}. ${line.trim()}`;
              }
              return line;
            })
            .join("\n");
          insertTextAtPosition(start, end, listLines);
        } else {
          insertText("1. ", "");
        }
        break;
      case "link":
        if (selectedText) {
          insertText("[", "]()");
          setTimeout(() => {
            if (editorRef.current) {
              const pos = editorRef.current.selectionStart - 1;
              editorRef.current.setSelectionRange(pos, pos);
            }
          }, 0);
        } else {
          insertText("[", "]()");
          setTimeout(() => {
            if (editorRef.current) {
              const pos = editorRef.current.selectionStart - 1;
              editorRef.current.setSelectionRange(pos, pos);
            }
          }, 0);
        }
        break;
      default:
        break;
    }
  };

  // 在指定位置插入文本（替换选中内容）
  const insertTextAtPosition = (start: number, end: number, text: string) => {
    if (!editorRef.current) return;
    const newText =
      contentDraft.substring(0, start) + text + contentDraft.substring(end);
    setContentDraft(newText);
    triggerAutoSave(newText);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newPos = start + text.length;
        editorRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
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

  // 处理引用标号点击
  const handleCitationNumberClick = (index: number) => {
    const citation = reviewCitations.find((c) => c.index === index);
    if (citation) {
      handleCitationClick(citation);
    }
  };

  // 检查答案是否表示找不到相关内容
  const isNoAnswerFound = (answer: string): boolean => {
    // 如果没有引用，直接返回找不到
    if (reviewCitations.length === 0) {
      return true;
    }

    const lowerAnswer = answer.toLowerCase();
    return (
      lowerAnswer.includes("知识库中没有相关内容") ||
      lowerAnswer.includes("没有找到") ||
      lowerAnswer.includes("找不到") ||
      lowerAnswer.includes("未找到") ||
      (lowerAnswer.includes("没有") && lowerAnswer.includes("信息"))
    );
  };

  // 渲染答案，将引用标号转换为可点击的链接，并显示详细信息
  const renderAnswerWithClickableCitations = (answer: string) => {
    // 匹配 [1], [2] 等引用标号
    const parts = answer.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const citationMatch = part.match(/\[(\d+)\]/);
      if (citationMatch) {
        const citationIndex = parseInt(citationMatch[1], 10);
        const citation = reviewCitations.find((c) => c.index === citationIndex);

        if (citation) {
          // 构建详细的引用信息提示
          const citationInfo = [
            citation.title || "文档",
            citation.chunk_position,
            citation.page && `第 ${citation.page} 页`,
            citation.chunk_index !== undefined &&
              `(Chunk #${citation.chunk_index + 1})`,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <span key={index} className="inline-flex items-center gap-1">
              <span
                className="text-blue-600 font-medium cursor-pointer hover:underline hover:text-blue-800 relative group"
                onClick={() => handleCitationNumberClick(citationIndex)}
                title={`点击查看引用来源: ${citationInfo}`}
              >
                {part}
                {/* 悬停时显示详细信息 */}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {citationInfo}
                </span>
              </span>
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
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
                  <Tooltip content="高亮">
                    <Button
                      type="text"
                      size="small"
                      onClick={() => handleFormat("highlight")}
                    >
                      <span className="text-yellow-600 font-bold">高</span>
                    </Button>
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
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(contentDraft || "*暂无内容*"),
                      }}
                    />
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
                      {/* 答案部分 - 只在有引用时显示 */}
                      {reviewCitations.length > 0 &&
                        !isNoAnswerFound(reviewAnswer) && (
                          <Card className="mb-4">
                            <div className="mb-3">
                              <Typography.Text className="text-sm font-semibold text-gray-700 mb-1 block">
                                AI 回答：
                              </Typography.Text>
                              {/* 引用来源统计 */}
                              <div className="text-xs text-gray-500 mb-2 flex flex-wrap items-center gap-2">
                                <span className="font-medium">引用来源：</span>
                                {reviewCitations.map((c) => (
                                  <span
                                    key={c.index}
                                    className="inline-flex items-center gap-1"
                                  >
                                    <span className="text-blue-600 font-medium">
                                      [{c.index}]
                                    </span>
                                    {c.chunk_position && (
                                      <span className="text-gray-400">
                                        {c.chunk_position}
                                        {c.page && `, 第 ${c.page} 页`}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed">
                              {renderAnswerWithClickableCitations(reviewAnswer)}
                              {reviewing && (
                                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
                              )}
                            </div>
                          </Card>
                        )}

                      {/* 如果没有找到相关内容 */}
                      {isNoAnswerFound(reviewAnswer) && (
                        <Card className="mb-4">
                          <div className="text-orange-600 text-center py-4">
                            <Typography.Text type="warning">
                              知识库中没有找到相关内容
                            </Typography.Text>
                          </div>
                        </Card>
                      )}

                      {/* 原文引用 - 只在有引用且找到相关内容时显示 */}
                      {reviewCitations.length > 0 &&
                        !isNoAnswerFound(reviewAnswer) && (
                          <div>
                            <Typography.Text className="text-sm font-semibold text-gray-700 mb-2 block">
                              原文引用：
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
                                      {/* 引用标号和标题 */}
                                      <div className="mb-2 flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex-shrink-0">
                                          {citation.index}
                                        </span>
                                        <div className="flex-1">
                                          {citation.title && (
                                            <Typography.Text className="text-base font-medium text-gray-800 block">
                                              {citation.title}
                                            </Typography.Text>
                                          )}
                                          {/* 引用来源详细信息 */}
                                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <span className="text-gray-600 font-medium">
                                              引用来源：
                                            </span>
                                            {citation.chunk_position && (
                                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                                {citation.chunk_position}
                                              </span>
                                            )}
                                            {citation.chunk_index !==
                                              undefined && (
                                              <span className="text-gray-500">
                                                (Chunk #
                                                {citation.chunk_index + 1})
                                              </span>
                                            )}
                                            {citation.page && (
                                              <span className="text-gray-500">
                                                第 {citation.page} 页
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* 原文内容 */}
                                      <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border-l-4 border-blue-400 mb-2">
                                        <span>{citation.snippet}</span>
                                      </div>

                                      {/* 来源信息 */}
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>
                                          {isMarkdownDoc
                                            ? "知识库文档"
                                            : citation.source
                                                .split("/")
                                                .pop() || citation.source}
                                        </span>
                                        {docId && (
                                          <span className="text-blue-600 hover:underline">
                                            点击查看原文 →
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
