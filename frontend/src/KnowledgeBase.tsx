import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { listKbDocs, getKbDoc, listHighlights, createHighlight, KbDocItem, KbDocDetail, Highlight } from "./api";

type SelectionInfo = {
  text: string;
};

const KnowledgeBase: React.FC = () => {
  const [docs, setDocs] = useState<KbDocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<KbDocDetail | null>(null);
  const [loadingDocContent, setLoadingDocContent] = useState(false);

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);

  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [highlightNote, setHighlightNote] = useState("");
  const [savingHighlight, setSavingHighlight] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingDocs(true);
      try {
        const data = await listKbDocs();
        setDocs(data);
        if (data.length > 0) {
          await openDoc(data[0].source);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDocs(false);
      }
    };
    load();
  }, []);

  const openDoc = async (source: string) => {
    setLoadingDocContent(true);
    try {
      const detail = await getKbDoc(source);
      setSelectedDoc(detail);
      setSelection(null);
      setHighlightNote("");
      await loadHighlightsForDoc(source);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDocContent(false);
    }
  };

  const loadHighlightsForDoc = async (source: string) => {
    setLoadingHighlights(true);
    try {
      const data = await listHighlights({ source });
      setHighlights(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHighlights(false);
    }
  };

  const handleMouseUpInContent = () => {
    if (!contentRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }
    setSelection({ text });
  };

  const handleSaveHighlight = async () => {
    if (!selectedDoc || !selection || savingHighlight) return;
    const text = selection.text.trim();
    if (!text) return;

    setSavingHighlight(true);
    try {
      await createHighlight({
        source: selectedDoc.source,
        topic: selectedDoc.topic,
        selected_text: text,
        note: highlightNote.trim() || undefined,
      });
      setSelection(null);
      setHighlightNote("");
      await loadHighlightsForDoc(selectedDoc.source);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingHighlight(false);
    }
  };

  const renderHighlightedMarkdown = () => {
    if (!selectedDoc) return null;
    const { content } = selectedDoc;

    if (!highlights.length) {
      return <ReactMarkdown>{content}</ReactMarkdown>;
    }

    const uniqTexts = Array.from(
      new Set(
        highlights
          .map((h) => h.selected_text?.trim())
          .filter((t): t is string => !!t)
      )
    ).sort((a, b) => b.length - a.length);

    let html = content;
    uniqTexts.forEach((t, idx) => {
      const safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const reg = new RegExp(safe, "g");
      const colors = ["#fef08a", "#bfdbfe", "#bbf7d0"];
      const color = colors[idx % colors.length];
      html = html.replace(
        reg,
        `<mark style="background:${color}; padding:0 2px; border-radius:2px;">${t}</mark>`
      );
    });

    return <ReactMarkdown>{html}</ReactMarkdown>;
  };


  return (
    <div className="h-screen flex">
      <aside className="w-64 border-r bg-white p-3 flex flex-col">
        <div className="mb-2 text-xs font-semibold text-gray-700">
          知识库文档（Markdown）
        </div>
        {loadingDocs ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            加载中...
          </div>
        ) : docs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
            请先在 backend/docs/ 放一些 .md 文件
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1">
            {docs.map((d) => {
              const active = selectedDoc && selectedDoc.source === d.source;
              return (
                <button
                  key={d.source}
                  onClick={() => openDoc(d.source)}
                  className={`w-full text-left rounded px-2 py-2 text-xs ${
                    active
                      ? "bg-blue-50 border border-blue-200 text-blue-700"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="font-medium truncate">{d.title}</div>
                  <div className="flex justify-between mt-1 text-[11px] text-gray-400">
                    <span>{d.topic}</span>
                    <span>阅读 {d.read_count} 次</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-10 flex items-center justify-between px-4 border-b bg-white">
          {selectedDoc ? (
            <>
              <div className="text-sm font-semibold text-gray-800 truncate">
                {selectedDoc.title}
                <span className="ml-2 text-xs text-gray-400">
                  ({selectedDoc.topic})
                </span>
              </div>
              <div className="text-[11px] text-gray-500">
                阅读次数：{selectedDoc.read_count}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400">请选择左侧文档</div>
          )}
        </header>

        <div className="flex-1 flex">
          <div
            className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 prose prose-sm max-w-none"
            ref={contentRef}
            onMouseUp={handleMouseUpInContent}
          >
            {loadingDocContent && (
              <div className="text-xs text-gray-400">文档加载中...</div>
            )}
            {!loadingDocContent && selectedDoc && renderHighlightedMarkdown()}
          </div>

          <aside className="w-72 border-l bg-white p-3 flex flex-col">
            <div className="text-xs font-semibold text-gray-700 mb-2">
              当前文档高亮
            </div>

            <div className="mb-3 text-xs">
              {selection ? (
                <div className="mb-2 border rounded p-2 bg-yellow-50 text-gray-800">
                  <div className="text-[11px] text-gray-600 mb-1">
                    已选中文本：
                  </div>
                  <div className="text-[11px] max-h-16 overflow-y-auto mb-2">
                    {selection.text}
                  </div>
                  <textarea
                    className="w-full border rounded px-2 py-1 text-[11px] mb-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    rows={2}
                    placeholder="写一点笔记（可选）"
                    value={highlightNote}
                    onChange={(e) => setHighlightNote(e.target.value)}
                  />
                  <div className="flex justify-end gap-1">
                    <button
                      className="px-2 py-1 rounded text-[11px] border border-gray-300 text-gray-600"
                      onClick={() => {
                        setSelection(null);
                        setHighlightNote("");
                      }}
                    >
                      取消
                    </button>
                    <button
                      className={`px-2 py-1 rounded text-[11px] text-white ${
                        savingHighlight
                          ? "bg-gray-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      onClick={handleSaveHighlight}
                      disabled={savingHighlight}
                    >
                      {savingHighlight ? "保存中..." : "保存高亮"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400">
                  在左侧正文中拖拽选择一段文字，这里可以保存为高亮。
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {loadingHighlights ? (
                <div className="text-xs text-gray-400">加载高亮中...</div>
              ) : highlights.length === 0 ? (
                <div className="text-xs text-gray-400">暂无高亮</div>
              ) : (
                highlights.map((h) => (
                  <div
                    key={h.id}
                    className="mb-2 border rounded p-2 text-[11px] hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="text-gray-800 mb-1 line-clamp-3">
                      {h.selected_text}
                    </div>
                    {h.note && (
                      <div className="text-gray-500">笔记：{h.note}</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default KnowledgeBase;
