import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import Vditor from "vditor";
import "vditor/dist/index.css";
import {
  Layout,
  Button,
  Input,
  Message,
  Spin,
  Empty,
  Popconfirm,
} from "@arco-design/web-react";
import { getDoc, updateDoc, deleteDoc, MarkdownDocDetail } from "../api";

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

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const vditorRef = useRef<Vditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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

  // 初始化 Vditor - 只在文档加载完成且容器存在时初始化
  useEffect(() => {
    if (!editorContainerRef.current || !currentDoc || vditorRef.current) return;

    const initVditor = () => {
      if (!editorContainerRef.current) return;

      vditorRef.current = new Vditor(editorContainerRef.current, {
        height: window.innerHeight - 100,
        mode: "sv",
        cache: {
          id: `vditor-${docId}`,
        },
        toolbar: [
          "headings",
          "bold",
          "italic",
          "strike",
          "line",
          "quote",
          "list",
          "ordered-list",
          "check",
          "code",
          "inline-code",
          "link",
          "table",
          "undo",
          "redo",
          "upload",
          "edit-mode",
          "both",
          "preview",
          "fullscreen",
          "outline",
          "devtools",
        ],
        value: contentDraft,
        input: (value: string) => {
          setContentDraft(value);
          // 触发自动保存
          triggerAutoSave(value);
        },
      });
    };

    // 延迟初始化确保 DOM 已渲染
    const timer = setTimeout(initVditor, 100);

    return () => {
      clearTimeout(timer);
      if (vditorRef.current) {
        vditorRef.current.destroy();
        vditorRef.current = null;
      }
    };
  }, [currentDoc]);

  // 当文档内容变化时，更新编辑器内容
  useEffect(() => {
    if (vditorRef.current && currentDoc && contentDraft !== undefined) {
      const currentValue = vditorRef.current.getValue();
      if (currentValue !== contentDraft) {
        vditorRef.current.setValue(contentDraft);
      }
    }
  }, [contentDraft, currentDoc]);

  // 处理高亮文本
  useEffect(() => {
    console.log("highlightText", highlightText);
    console.log("vditorRef.current", vditorRef.current);
    console.log("currentDoc", currentDoc);
    if (!highlightText || !currentDoc) return;

    // 延迟执行，确保编辑器已完全渲染
    const timer = setTimeout(() => {
      try {
        // 尝试切换到预览模式（如果还没有）
        const vditor = vditorRef.current;
        if (vditor) {
          // 获取预览元素
          const previewElement = document.querySelector(
            ".vditor-preview"
          ) as HTMLElement;

          console.log("previewElement", previewElement);

          // 如果预览元素不存在，尝试切换到预览模式
          if (!previewElement) {
            // Vditor 的预览模式切换按钮可能有多种选择器
            const previewBtn = document.querySelector(
              '[data-type="preview"], button[aria-label*="预览"], .vditor-toolbar [data-type="preview"]'
            ) as HTMLElement;

            if (previewBtn) {
              previewBtn.click();
              // 等待预览模式切换完成后再高亮
              setTimeout(() => {
                const newPreviewElement = document.querySelector(
                  ".vditor-preview"
                ) as HTMLElement;
                if (newPreviewElement) {
                  highlightTextInPreview(highlightText);
                } else {
                  console.warn("Failed to switch to preview mode");
                }
              }, 500);
              return;
            } else {
              console.warn(
                "Preview button not found, trying alternative method"
              );
              // 如果找不到预览按钮，尝试直接使用 Vditor API
              // Vditor 可能支持直接获取预览 HTML
              try {
                const previewHTML = vditor.getHTML();
                if (previewHTML) {
                  // 创建一个临时预览元素来高亮
                  const tempDiv = document.createElement("div");
                  tempDiv.innerHTML = previewHTML;
                  const searchText = highlightText.substring(0, 100).trim();
                  const escapedText = searchText.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                  );
                  const regex = new RegExp(escapedText, "gi");

                  if (regex.test(tempDiv.textContent || "")) {
                    // 找到文本，尝试在编辑器中滚动
                    const editorElement = document.querySelector(
                      ".vditor-sv"
                    ) as HTMLElement;
                    if (editorElement) {
                      const textContent = editorElement.textContent || "";
                      const index = textContent.indexOf(searchText);
                      if (index !== -1) {
                        // 尝试滚动到文本位置
                        editorElement.scrollTop =
                          (index / textContent.length) *
                          editorElement.scrollHeight;
                      }
                    }
                  }
                }
              } catch (e) {
                console.error("Alternative highlight method failed:", e);
              }
            }
          } else {
            highlightTextInPreview(highlightText);
          }
        }
      } catch (e) {
        console.error("Failed to highlight text:", e);
      }
    }, 800); // 增加延迟时间，确保 Vditor 完全加载

    const highlightTextInPreview = (text: string) => {
      const vditor = vditorRef.current;
      if (!vditor) {
        console.warn("Vditor instance not found");
        return;
      }

      // 使用 Vditor API 获取预览 HTML
      let content: string;
      try {
        // 尝试获取预览 HTML
        content = vditor.getHTML() || "";
        console.log("Got content from getHTML:", content.length, "chars");
      } catch (e) {
        console.warn("getHTML failed, trying getValue:", e);
        // 如果 getHTML 失败，尝试获取 Markdown 值
        content = vditor.getValue() || "";
      }

      if (!content) {
        // 如果 API 获取失败，尝试从 DOM 获取
        const previewElement = document.querySelector(
          ".vditor-preview"
        ) as HTMLElement;
        if (previewElement) {
          content =
            previewElement.innerHTML || previewElement.textContent || "";
        }
      }

      if (!content) {
        console.warn("Could not get content from Vditor");
        return;
      }

      // 使用前100个字符进行匹配（避免文本过长）
      const searchText = text.substring(0, 100).trim();
      if (!searchText) return;

      // 转义特殊字符用于正则表达式
      const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      console.log("Searching for:", escapedText.substring(0, 50));

      // 检查内容中是否包含搜索文本（不区分大小写）
      const regex = new RegExp(escapedText, "gi");

      if (regex.test(content)) {
        // 替换匹配的文本为高亮标记
        const highlighted = content.replace(
          regex,
          '<mark style="background-color: #ffeb3b; padding: 2px 4px; border-radius: 2px; font-weight: 500;">$&</mark>'
        );

        // 尝试更新预览元素
        const previewElement = document.querySelector(
          ".vditor-preview"
        ) as HTMLElement;

        if (previewElement) {
          previewElement.innerHTML = highlighted;

          // 滚动到第一个高亮位置
          const markElement = previewElement.querySelector("mark");
          if (markElement) {
            markElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        } else {
          // 如果没有预览元素，尝试在编辑器中定位
          const editorElement = document.querySelector(
            ".vditor-sv"
          ) as HTMLElement;
          if (editorElement) {
            const textContent = editorElement.textContent || "";
            const index = textContent.indexOf(searchText);
            if (index !== -1) {
              // 尝试滚动到文本位置
              const textNodes = getTextNodes(editorElement);
              for (const node of textNodes) {
                if (node.textContent && node.textContent.includes(searchText)) {
                  const element = node.parentElement;
                  if (element) {
                    element.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                    // 添加临时高亮
                    element.style.outline = "3px solid #ffeb3b";
                    element.style.outlineOffset = "2px";
                    setTimeout(() => {
                      element.style.outline = "";
                      element.style.outlineOffset = "";
                    }, 3000);
                    break;
                  }
                }
              }
            }
          }
        }
      } else {
        console.warn("Text not found in content:", searchText);
      }
    };

    const getTextNodes = (element: HTMLElement): Text[] => {
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      return textNodes;
    };

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
          const currentContent = vditorRef.current?.getValue() || contentDraft;
          const detail = await updateDoc(docId, {
            title: titleDraft,
            content: currentContent,
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
      // 从 Vditor 获取最新内容
      const currentContent = vditorRef.current?.getValue() || contentDraft;
      const detail = await updateDoc(docId, {
        title: titleDraft,
        content: currentContent,
      });
      setCurrentDoc(detail);
      setContentDraft(currentContent);
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

      <Content className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Spin />
          </div>
        ) : !currentDoc ? (
          <div className="h-full flex items-center justify-center">
            <Empty description="文档不存在" />
          </div>
        ) : (
          <div
            ref={editorContainerRef}
            className="w-full"
            style={{ height: "calc(100vh - 56px)", minHeight: 400 }}
          />
        )}
      </Content>
    </Layout>
  );
};

export default DocPage;
