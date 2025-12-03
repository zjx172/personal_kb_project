import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const docId = id || null;

  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("general");
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
      setTopicDraft(detail.topic);
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
          topic: topicDraft,
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

  // 监听标题和主题变化，也触发自动保存
  useEffect(() => {
    if (
      currentDoc &&
      docId &&
      (titleDraft !== currentDoc.title || topicDraft !== currentDoc.topic)
    ) {
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
            topic: topicDraft,
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
  }, [titleDraft, topicDraft]);

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
        topic: topicDraft,
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
          <Input
            placeholder="topic（例如 nlp / backend）"
            value={topicDraft}
            onChange={setTopicDraft}
            style={{ width: 180 }}
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
