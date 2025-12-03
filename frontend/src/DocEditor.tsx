import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  listDocs,
  createDoc,
  getDoc,
  updateDoc,
  MarkdownDocItem,
  MarkdownDocDetail,
} from "./api";

const DocEditor: React.FC = () => {
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("general");
  const [contentDraft, setContentDraft] = useState("");

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await listDocs();
      console.log("data", data);
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
      setTopicDraft(detail.topic);
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
        topic: "general",
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
        topic: topicDraft,
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
    <div className="h-full w-full flex bg-gray-50">
      <aside className="w-64 border-r bg-white flex flex-col">
        <div className="h-12 px-3 flex items-center justify-between border-b">
          <div className="text-xs font-semibold text-gray-700">文档列表</div>
          <button
            className="text-xs px-2 py-1 rounded bg-blue-600 text-white"
            onClick={handleCreate}
          >
            新建
          </button>
        </div>
        {loadingList ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            加载中...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {docs.length === 0 ? (
              <div className="text-xs text-gray-400">
                暂无文档，点右上角“新建”～
              </div>
            ) : (
              docs.map((d) => {
                const active = selectedId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => openDoc(d.id)}
                    className={`w-full text-left rounded px-2 py-2 text-xs ${
                      active
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="flex justify-between mt-1 text-[11px] text-gray-400">
                      <span>{d.topic}</span>
                      <span>
                        {new Date(d.updated_at).toLocaleDateString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-12 px-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              className="text-sm font-semibold border-none focus:outline-none px-2 py-1 rounded bg-gray-100"
              placeholder="文档标题"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
            />
            <input
              className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="topic（例如 nlp / backend）"
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 text-xs">
            {currentDoc && (
              <span className="text-gray-400">
                最后保存：
                {new Date(currentDoc.updated_at).toLocaleString()}
              </span>
            )}
            <button
              className={`px-3 py-1 rounded text-xs text-white ${
                saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={handleSave}
              disabled={saving || !selectedId}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </header>

        {error && (
          <div className="px-4 py-1 text-xs text-red-500 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}

        {!currentDoc ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            请选择左侧文档，或新建一个～
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 border-r flex flex-col">
              <div className="h-8 px-3 flex items-center text-[11px] text-gray-500 border-b bg-gray-50">
                Markdown 编辑
              </div>
              <textarea
                className="flex-1 w-full px-3 py-2 text-sm font-mono resize-none border-none outline-none bg-white"
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                placeholder="在这里输入 Markdown 内容..."
              />
            </div>

            <div className="w-1/2 flex flex-col">
              <div className="h-8 px-3 flex items-center text-[11px] text-gray-500 border-b bg-gray-50">
                预览
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 bg-white">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {contentDraft || "*（暂无内容）*"}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DocEditor;
