import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
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
const { TextArea } = Input;

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

  const handleSave = async () => {
    if (!docId) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await updateDoc(docId, {
        title: titleDraft,
        topic: topicDraft,
        content: contentDraft,
      });
      setCurrentDoc(detail);
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
        <Spin loading={loading} className="w-full h-full">
          {!currentDoc ? (
            <div className="h-full flex items-center justify-center">
              <Empty description="文档不存在" />
            </div>
          ) : (
            <Layout className="h-full">
              <Sider width="50%" className="border-r">
                <div className="h-8 px-3 flex items-center text-xs text-gray-500 border-b bg-gray-50">
                  Markdown 编辑
                </div>
                <TextArea
                  value={contentDraft}
                  onChange={setContentDraft}
                  placeholder="在这里输入 Markdown 内容..."
                  style={{
                    height: "calc(100% - 32px)",
                    fontFamily: "monospace",
                  }}
                />
              </Sider>
              <Content>
                <div className="h-8 px-3 flex items-center text-xs text-gray-500 border-b bg-gray-50">
                  预览
                </div>
                <div className="overflow-y-auto px-4 py-3 h-full">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {contentDraft || "*（暂无内容）*"}
                    </ReactMarkdown>
                  </div>
                </div>
              </Content>
            </Layout>
          )}
        </Spin>
      </Content>
    </Layout>
  );
};

export default DocPage;
