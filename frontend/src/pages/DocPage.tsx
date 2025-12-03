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
} from "@arco-design/web-react";
import { getDoc, updateDoc, MarkdownDocDetail } from "../api";

const { Sider, Content, Header } = Layout;

const DocPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = id ? parseInt(id, 10) : null;

  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!docId) return;
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
      Message.success("保存成功");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存失败");
      Message.error(e?.message || "保存失败");
    } finally {
      setSaving(false);
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
          {currentDoc && (
            <span className="text-xs text-gray-400">
              最后保存：
              {new Date(currentDoc.updated_at).toLocaleString()}
            </span>
          )}
          <Button
            type="primary"
            size="small"
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
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
