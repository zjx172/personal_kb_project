import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getDoc,
  updateDoc,
  deleteDoc,
  MarkdownDocDetail,
  queryKnowledgeBaseStream,
  Citation,
  getPdfUrl,
} from "../api";
import { PdfViewer } from "../components/PdfViewer";
import { DocHeader } from "../components/doc-editor/DocHeader";
import { DocTitle } from "../components/doc-editor/DocTitle";
import { MarkdownToolbar } from "../components/doc-editor/MarkdownToolbar";
import {
  MarkdownEditor,
  MarkdownEditorRef,
} from "../components/doc-editor/MarkdownEditor";
import { ReviewPanel } from "../components/doc-editor/ReviewPanel";
import {
  createFormatUtils,
  handleFormat,
} from "../components/doc-editor/formatUtils";

const DocPage: React.FC = () => {
  const { id, knowledgeBaseId } = useParams<{
    id: string;
    knowledgeBaseId?: string;
  }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const docId = id || null;
  const highlightTextParam = searchParams.get("highlight");
  const highlightText = highlightTextParam
    ? decodeURIComponent(highlightTextParam)
    : null;
  const highlightPageParam = searchParams.get("page");
  const highlightPage = highlightPageParam
    ? parseInt(highlightPageParam, 10)
    : null;

  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // 复习知识相关状态
  const [reviewQuery, setReviewQuery] = useState("");
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewCitations, setReviewCitations] = useState<Citation[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "both">("both");
  const editorRef = useRef<MarkdownEditorRef>(null);

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

  // 处理格式化
  const handleFormatClick = (type: string) => {
    if (!editorRef.current?.editorRef.current) return;

    const formatUtils = createFormatUtils(
      editorRef.current.editorRef,
      contentDraft,
      handleContentChange
    );

    handleFormat(type, formatUtils, editorRef.current.editorRef, contentDraft);
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
          question: reviewQuery,
          k: 5,
          rerank_k: 3,
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
      navigate(
        `/kb/${knowledgeBaseId}/doc/${docId}?highlight=${highlightParam}`
      );
    } else if (docId) {
      navigate(`/kb/${knowledgeBaseId}/doc/${docId}`);
    }
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
      <DocHeader
        saving={saving}
        lastSaved={lastSaved}
        currentDoc={currentDoc}
        showReviewPanel={showReviewPanel}
        onBack={() => {
          if (knowledgeBaseId) {
            navigate(`/kb/${knowledgeBaseId}`);
          } else {
            navigate("/");
          }
        }}
        onSave={handleManualSave}
        onDelete={handleDelete}
        onToggleReviewPanel={() => setShowReviewPanel(!showReviewPanel)}
      />

      {/* 标题区域 */}
      <DocTitle
        currentDoc={currentDoc}
        title={titleDraft}
        onTitleChange={setTitleDraft}
      />

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
              {currentDoc?.doc_type !== "pdf" && (
                <MarkdownToolbar
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onFormat={handleFormatClick}
                />
              )}

              {/* 编辑器区域 */}
              <div className="flex-1 flex overflow-hidden">
                {currentDoc?.doc_type === "pdf" ? (
                  // PDF预览模式
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <PdfViewer
                      url={getPdfUrl(currentDoc.id)}
                      title={currentDoc.title || "PDF文档"}
                      docId={currentDoc.id}
                      initialPage={highlightPage ?? undefined}
                      focusText={highlightText ?? undefined}
                    />
                  </div>
                ) : (
                  // Markdown编辑模式
                  <MarkdownEditor
                    ref={editorRef}
                    content={contentDraft}
                    viewMode={viewMode}
                    highlightText={highlightText}
                    onContentChange={handleContentChange}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* 复习知识侧边栏 */}
        {showReviewPanel && (
          <ReviewPanel
            query={reviewQuery}
            answer={reviewAnswer}
            citations={reviewCitations}
            reviewing={reviewing}
            onQueryChange={setReviewQuery}
            onQuery={handleReviewQuery}
            onClose={() => setShowReviewPanel(false)}
            onCitationClick={handleCitationClick}
          />
        )}
      </div>
    </div>
  );
};

export default DocPage;
