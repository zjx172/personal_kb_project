import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { markdownToHtml } from "../utils/markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Eye,
  Edit,
  SplitSquareHorizontal,
  X,
  Brain,
  Search,
  Highlighter,
  Heading1,
} from "lucide-react";
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
  getPdfUrl,
} from "../api";
import { PdfViewer } from "../components/PdfViewer";

const DocPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
    // 检查认证状态
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (docId && user) {
      loadDoc();
    }
  }, [docId, user, authLoading, navigate]);

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
        toast.error("自动保存失败");
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

  // 获取当前行的信息（开始位置、结束位置、内容）
  const getCurrentLineInfo = (cursorPos: number) => {
    let lineStart = cursorPos;
    while (lineStart > 0 && contentDraft[lineStart - 1] !== "\n") {
      lineStart--;
    }

    let lineEnd = cursorPos;
    while (lineEnd < contentDraft.length && contentDraft[lineEnd] !== "\n") {
      lineEnd++;
    }

    const currentLine = contentDraft.substring(lineStart, lineEnd);
    return { lineStart, lineEnd, currentLine };
  };

  // 在行首插入标记（如果行有内容），否则在光标位置插入
  const insertAtLineStartOrCursor = (
    marker: string,
    cursorPos: number,
    togglePattern?: RegExp,
    removePattern?: RegExp
  ) => {
    const { lineStart, lineEnd, currentLine } = getCurrentLineInfo(cursorPos);

    if (currentLine.trim().length > 0) {
      // 如果行有内容，检查是否已经有标记（用于切换功能）
      if (togglePattern && togglePattern.test(currentLine.trim())) {
        // 移除标记
        const unmarkedLine = currentLine.replace(
          removePattern || togglePattern,
          ""
        );
        insertTextAtPosition(lineStart, lineEnd, unmarkedLine);
        setTimeout(() => {
          if (editorRef.current) {
            const offsetFromLineStart = cursorPos - lineStart;
            const removedLength = currentLine.length - unmarkedLine.length;
            const newPos = lineStart + unmarkedLine.length;
            editorRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      } else {
        // 在行首插入标记
        insertTextAtPosition(lineStart, lineStart, marker);
        setTimeout(() => {
          if (editorRef.current) {
            const offsetFromLineStart = cursorPos - lineStart;
            const newPos = lineStart + marker.length + offsetFromLineStart;
            editorRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
      }
    } else {
      // 如果行没有内容，在光标位置插入
      insertText(marker, "");
    }
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
          insertAtLineStartOrCursor("> ", start, /^>\s*/, /^>\s*/);
        }
        break;
      case "heading":
        if (selectedText) {
          if (selectedText.match(/^#{1,6} /)) {
            // 如果已经是标题，移除标题标记
            const unformatted = selectedText.replace(/^#{1,6} /, "");
            insertTextAtPosition(start, end, unformatted);
          } else {
            // 如果选中了多行，给每行添加标题标记
            const lines = selectedText.split("\n");
            const headingLines = lines
              .map((line) => `# ${line.trim()}`)
              .join("\n");
            insertTextAtPosition(start, end, headingLines);
          }
        } else {
          insertAtLineStartOrCursor("# ", start, /^#{1,6}\s*/, /^#{1,6}\s*/);
        }
        break;
      case "ul":
        if (selectedText) {
          const lines = selectedText.split("\n");
          const listLines = lines
            .map((line) => {
              if (line.trim()) {
                // 如果已经有列表标记，移除后添加
                const trimmed = line.trim().replace(/^[-*+]\s+/, "");
                return `- ${trimmed}`;
              }
              return line;
            })
            .join("\n");
          insertTextAtPosition(start, end, listLines);
        } else {
          insertAtLineStartOrCursor("- ", start, /^[-*+]\s+/, /^[-*+]\s+/);
        }
        break;
      case "ol":
        if (selectedText) {
          const lines = selectedText.split("\n");
          let counter = 1;
          const listLines = lines
            .map((line) => {
              if (line.trim()) {
                // 如果已经有有序列表标记，移除后添加
                const trimmed = line.trim().replace(/^\d+\.\s+/, "");
                return `${counter++}. ${trimmed}`;
              }
              return line;
            })
            .join("\n");
          insertTextAtPosition(start, end, listLines);
        } else {
          insertAtLineStartOrCursor("1. ", start, /^\d+\.\s+/, /^\d+\.\s+/);
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
          toast.error("自动保存失败");
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
      toast.success("保存成功");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存失败");
      toast.error(e?.message || "保存失败");
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
      toast.success("摘要生成成功");
      await loadDoc(); // 重新加载文档
    } catch (e: any) {
      toast.error(e?.message || "生成摘要失败");
    }
  };

  // 手动推荐标签
  const handleRecommendTags = async () => {
    if (!docId) return;
    try {
      const result = await recommendDocTags(docId);
      toast.success("标签推荐成功");
      await loadDoc(); // 重新加载文档
    } catch (e: any) {
      toast.error(e?.message || "推荐标签失败");
    }
  };

  const handleDelete = async () => {
    if (!docId) return;
    try {
      await deleteDoc(docId);
      toast.success("文档已删除");
      navigate("/"); // 删除后返回主页
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "删除失败");
    }
  };

  // 复习知识功能
  const handleReviewQuery = async () => {
    if (!reviewQuery.trim()) {
      toast.warning("请输入问题");
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
      toast.error(e?.message || "搜索失败");
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
                className="text-primary font-medium cursor-pointer hover:underline relative group"
                onClick={() => handleCitationNumberClick(citationIndex)}
                title={`点击查看引用来源: ${citationInfo}`}
              >
                {part}
                {/* 悬停时显示详细信息 */}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground border border-border text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
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
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">文档 ID 无效</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <header className="border-b bg-card flex flex-col flex-shrink-0">
        <div className="h-14 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewPanel(!showReviewPanel)}
              className="gap-2"
            >
              <Brain className="h-4 w-4" />
              {showReviewPanel ? "隐藏" : "复习知识"}
            </Button>
            {saving && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>保存中...</span>
              </div>
            )}
            {lastSaved && !saving && (
              <span className="text-xs text-muted-foreground">
                已保存：{lastSaved.toLocaleTimeString()}
              </span>
            )}
            {!lastSaved && currentDoc && !saving && (
              <span className="text-xs text-muted-foreground">
                最后保存：{new Date(currentDoc.updated_at).toLocaleString()}
              </span>
            )}
            <Button
              size="sm"
              onClick={handleManualSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              保存
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确定要删除这个文档吗？</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作无法撤销，文档将被永久删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {/* 标题区域 */}
        {currentDoc && (
          <div className="px-6 py-6 border-t bg-gradient-to-b from-card to-background">
            <input
              type="text"
              placeholder="输入文档标题..."
              value={titleDraft}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitleDraft(e.target.value)
              }
              className="w-full text-4xl font-bold bg-transparent border-none outline-none focus:outline-none placeholder:text-muted-foreground/40 resize-none transition-all"
              style={{
                lineHeight: "1.3",
                letterSpacing: "-0.02em",
              }}
            />
            {currentDoc.updated_at && (
              <p className="text-sm text-muted-foreground mt-2">
                最后更新：
                {new Date(currentDoc.updated_at).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !currentDoc ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">文档不存在</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 工具栏 */}
              <TooltipProvider>
                <div className="border-b bg-card px-4 py-2 flex items-center gap-2 flex-shrink-0">
                  {currentDoc?.doc_type !== "pdf" && (
                    <>
                      <div className="flex items-center gap-1 border-r pr-2 mr-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("bold")}
                              className="h-8 w-8 p-0"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>粗体</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("italic")}
                              className="h-8 w-8 p-0"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>斜体</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("strikethrough")}
                              className="h-8 w-8 p-0"
                            >
                              <Strikethrough className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除线</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("code")}
                              className="h-8 w-8 p-0"
                            >
                              <Code className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>行内代码</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("highlight")}
                              className="h-8 w-8 p-0"
                            >
                              <Highlighter className="h-4 w-4 text-yellow-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>高亮</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-1 border-r pr-2 mr-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("heading")}
                              className="h-8 w-8 p-0"
                            >
                              <Heading1 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>标题</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("quote")}
                              className="h-8 w-8 p-0"
                            >
                              <Quote className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>引用</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("ul")}
                              className="h-8 w-8 p-0"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>无序列表</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("ol")}
                              className="h-8 w-8 p-0"
                            >
                              <ListOrdered className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>有序列表</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFormat("link")}
                              className="h-8 w-8 p-0"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>链接</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Tabs
                          value={viewMode}
                          onValueChange={(v) => setViewMode(v as any)}
                        >
                          <TabsList>
                            <TabsTrigger value="edit" className="gap-2">
                              <Edit className="h-4 w-4" />
                              编辑
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                              <Eye className="h-4 w-4" />
                              预览
                            </TabsTrigger>
                            <TabsTrigger value="both" className="gap-2">
                              <SplitSquareHorizontal className="h-4 w-4" />
                              分屏
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                    </>
                  )}
                </div>
              </TooltipProvider>

              {/* 编辑器区域 */}
              <div className="flex-1 flex overflow-hidden">
                {currentDoc?.doc_type === "pdf" ? (
                  // PDF预览模式
                  <PdfViewer
                    url={getPdfUrl(currentDoc.id)}
                    title={currentDoc.title || "PDF文档"}
                    />
                ) : (
                  // Markdown编辑模式
                  <>
                    {(viewMode === "edit" || viewMode === "both") && (
                      <div
                        className={`${
                          viewMode === "both" ? "w-1/2" : "w-full"
                        } flex flex-col border-r bg-background`}
                      >
                        <textarea
                          ref={editorRef}
                          value={contentDraft}
                          onChange={(e) => handleContentChange(e.target.value)}
                          className="flex-1 w-full p-6 resize-none outline-none text-sm leading-relaxed bg-background font-mono"
                          placeholder="开始输入...支持 Markdown 语法"
                          style={{
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
                        } overflow-y-auto p-6 bg-background`}
                        style={{
                          maxWidth: viewMode === "both" ? "100%" : "900px",
                          margin: viewMode === "both" ? "0" : "0 auto",
                        }}
                      >
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert"
                          dangerouslySetInnerHTML={{
                            __html: markdownToHtml(
                              contentDraft || "*暂无内容*"
                            ),
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 复习知识侧边栏 */}
        {showReviewPanel && (
          <div className="w-96 border-l bg-card overflow-y-auto flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">复习知识</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReviewPanel(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入问题，在知识库中查找答案..."
                    value={reviewQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setReviewQuery(e.target.value)
                    }
                    onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReviewQuery();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleReviewQuery}
                    disabled={reviewing}
                    size="sm"
                    className="gap-2"
                  >
                    {reviewing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    搜索
                  </Button>
                </div>
              </div>

              {/* 搜索结果 */}
              {(reviewAnswer || reviewing) && (
                <div className="mt-4 space-y-4">
                  {reviewing && !reviewAnswer && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="ml-3 text-muted-foreground">
                        正在搜索...
                      </span>
                    </div>
                  )}

                  {reviewAnswer && (
                    <>
                      {/* 答案部分 - 只在有引用时显示 */}
                      {reviewCitations.length > 0 &&
                        !isNoAnswerFound(reviewAnswer) && (
                          <Card>
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <h4 className="text-sm font-semibold mb-2">
                                  AI 回答
                                </h4>
                                {/* 引用来源统计 */}
                                <div className="text-xs text-muted-foreground mb-2 flex flex-wrap items-center gap-2">
                                  <span className="font-medium">
                                    引用来源：
                                  </span>
                                  {reviewCitations.map((c) => (
                                    <span
                                      key={c.index}
                                      className="inline-flex items-center gap-1"
                                    >
                                      <span className="text-primary font-medium">
                                        [{c.index}]
                                      </span>
                                      {c.chunk_position && (
                                        <span className="text-muted-foreground">
                                          {c.chunk_position}
                                          {c.page && `, 第 ${c.page} 页`}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-sm leading-relaxed">
                                {renderAnswerWithClickableCitations(
                                  reviewAnswer
                                )}
                                {reviewing && (
                                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                      {/* 如果没有找到相关内容 */}
                      {isNoAnswerFound(reviewAnswer) && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-center py-4">
                              <p className="text-sm text-orange-600">
                                知识库中没有找到相关内容
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* 原文引用 - 只在有引用且找到相关内容时显示 */}
                      {reviewCitations.length > 0 &&
                        !isNoAnswerFound(reviewAnswer) && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              原文引用
                            </h4>
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
                                    className={`cursor-pointer transition-all ${
                                      docId
                                        ? "hover:shadow-md hover:border-primary"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleCitationClick(citation)
                                    }
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex flex-col">
                                        {/* 引用标号和标题 */}
                                        <div className="mb-2 flex items-center gap-2">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                                            {citation.index}
                                          </span>
                                          <div className="flex-1">
                                            {citation.title && (
                                              <p className="text-base font-medium block">
                                                {citation.title}
                                              </p>
                                            )}
                                            {/* 引用来源详细信息 */}
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                              <span className="font-medium">
                                                引用来源：
                                              </span>
                                              {citation.chunk_position && (
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                  {citation.chunk_position}
                                                </span>
                                              )}
                                              {citation.chunk_index !==
                                                undefined && (
                                                <span>
                                                  (Chunk #
                                                  {citation.chunk_index + 1})
                                                </span>
                                              )}
                                              {citation.page && (
                                                <span>
                                                  第 {citation.page} 页
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* 原文内容 */}
                                        <div className="text-sm leading-relaxed bg-muted p-3 rounded border-l-4 border-primary mb-2">
                                          <span>{citation.snippet}</span>
                                        </div>

                                        {/* 来源信息 */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>
                                            {isMarkdownDoc
                                              ? "知识库文档"
                                              : citation.source
                                                  .split("/")
                                                  .pop() || citation.source}
                                          </span>
                                          {docId && (
                                            <span className="text-primary hover:underline">
                                              点击查看原文 →
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
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
                <div className="text-center text-muted-foreground mt-8">
                  <p className="text-sm">输入问题，在知识库中查找准确的答案</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocPage;
