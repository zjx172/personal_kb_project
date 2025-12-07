import React, { useEffect, useState } from "react";
import { markdownToHtml } from "../../utils/markdown";
import {
  Layout,
  Button,
  List,
  Input,
  Message,
  Spin,
  Empty,
} from "@arco-design/web-react";
import {
  listDocs,
  createDoc,
  getDoc,
  updateDoc,
  MarkdownDocItem,
  MarkdownDocDetail,
} from "../../api";

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;

const DocEditor: React.FC = () => {
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await listDocs();
      setDocs(data);
      if (!selectedId && data?.length > 0) {
        await openDoc(data?.[0]?.id);
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "加载文档列表失败");
    } finally {
      setLoadingList(false);
    }
  };

  const openDoc = async (id: number) => {
    setError(null);
    try {
      const detail = await getDoc(id);
      setSelectedId(id);
      setCurrentDoc(detail);
      setTitleDraft(detail.title);
      setContentDraft(detail.content);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "加载文档失败");
    }
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const detail = await createDoc({
        title: "未命名文档",
        content: "",
      });
      await loadList();
      await openDoc(detail.id);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "新建文档失败");
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await updateDoc(selectedId, {
        title: titleDraft,
        content: contentDraft,
      });
      setCurrentDoc(detail);
      await loadList();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout className="h-full">
      <Sider width={260} className="border-r">
        <div className="h-12 px-3 flex items-center justify-between border-b">
          <div className="text-sm font-semibold">文档列表</div>
          <Button type="primary" size="small" onClick={handleCreate}>
            新建
          </Button>
        </div>
        <div
          className="overflow-y-auto"
          style={{ height: "calc(100% - 48px)" }}
        >
          <Spin loading={loadingList} className="w-full">
            {docs.length === 0 ? (
              <Empty description="暂无文档，点击新建" className="mt-8" />
            ) : (
              <List
                dataSource={docs}
                render={(item) => (
                  <List.Item
                    key={item.id}
                    className={`cursor-pointer ${
                      selectedId === item.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => openDoc(item.id)}
                  >
                    <div>
                      <div className="font-medium truncate">{item.title}</div>
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
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </div>
      </Sider>

      <Layout className="flex-1">
        <Header className="h-14 px-4 border-b flex items-center justify-between">
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
              disabled={!selectedId}
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
          {!currentDoc ? (
            <div className="h-full flex items-center justify-center">
              <Empty description="请选择左侧文档，或新建一个" />
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
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(contentDraft || "*（暂无内容）*"),
                    }}
                  />
                </div>
              </Content>
            </Layout>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DocEditor;
