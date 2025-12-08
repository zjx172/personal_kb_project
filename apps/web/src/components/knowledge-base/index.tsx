import React, { useEffect, useState, useRef } from "react";
import { markdownToHtml } from "../../utils/markdown";
import {
  Layout,
  List,
  Button,
  Input,
  Spin,
  Empty,
  Typography,
} from "@arco-design/web-react";
import type {
  HighlightOut as Highlight,
  MarkdownDocDetail,
  MarkdownDocItem,
} from "../../generated/api";
import { listHighlights, createHighlight, listDocs, getDoc } from "../../api";

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;

type SelectionInfo = {
  text: string;
};

const KnowledgeBase: React.FC = () => {
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MarkdownDocDetail | null>(
    null
  );
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
        const data = await listDocs();
        setDocs(data);
        if (!selectedId && data?.length > 0) {
          await openDoc(data?.[0]?.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingDocs(false);
      }
    };
    load();
  }, []);

  const openDoc = async (id: string) => {
    setSelectedId(id);
    setLoadingDocContent(true);
    try {
      const detail = await getDoc(id);
      setSelectedDoc(detail);
      setSelection(null);
      setHighlightNote("");
      // 使用文档 ID 作为 source 来加载高亮
      await loadHighlightsForDoc(`markdown_doc:${id}`);
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
      const source = `markdown_doc:${selectedDoc.id}`;
      await createHighlight({
        source: source,
        rects: [],
        selected_text: text,
        note: highlightNote.trim() || undefined,
      });
      setSelection(null);
      setHighlightNote("");
      await loadHighlightsForDoc(source);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingHighlight(false);
    }
  };

  const renderHighlightedMarkdown = () => {
    if (!selectedDoc) return null;
    const { content } = selectedDoc;

    // 为每个高亮创建唯一的 id
    let processedContent = content;
    if (highlights.length > 0) {
      highlights.forEach((h) => {
        const text = h.selected_text?.trim();
        if (!text) return;
        const safe = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reg = new RegExp(safe, "g");
        const highlightId = `hl-${h.id}`;
        processedContent = processedContent.replace(
          reg,
          `<mark id="${highlightId}" style="background:#fef08a; padding:0 2px; border-radius:2px; cursor:pointer;" onclick="document.getElementById('${highlightId}').scrollIntoView({behavior:'smooth',block:'center'})">${text}</mark>`
        );
      });
    }

    const html = markdownToHtml(processedContent, { generateHeadingIds: true });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // 点击高亮列表项时跳转到对应位置
  const handleHighlightClick = (highlightId: number) => {
    const element = document.getElementById(`hl-${highlightId}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // 添加一个短暂的闪烁效果
      element.style.transition = "background-color 0.3s";
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#fbbf24";
      setTimeout(() => {
        element.style.backgroundColor = originalBg || "#fef08a";
      }, 500);
    }
  };

  return (
    <Layout className="h-full">
      <Sider width={260} className="border-r p-3">
        <div className="mb-2 text-sm font-semibold">知识库文档</div>
        <div
          className="overflow-y-auto"
          style={{ height: "calc(100% - 32px)" }}
        >
          <Spin loading={loadingDocs} className="w-full">
            {docs.length === 0 ? (
              <Empty description="暂无文档" className="mt-8" />
            ) : (
              <List
                dataSource={docs}
                render={(item) => (
                  <List.Item
                    key={item.id}
                    className={`cursor-pointer ${
                      selectedDoc && selectedDoc.id === item.id
                        ? "bg-blue-50"
                        : ""
                    }`}
                    onClick={() => openDoc(item.id)}
                  >
                    <div>
                      <div className="font-medium truncate">{item.title}</div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </div>
      </Sider>

      <Layout className="flex-1">
        <Header className="h-12 flex items-center justify-between px-4 border-b">
          {selectedDoc ? (
            <>
              <div className="text-sm font-semibold text-gray-800 truncate">
                {selectedDoc.title}
              </div>
              <Typography.Text type="secondary" className="text-xs">
                {/* 阅读次数：{selectedDoc.read_count} */}
              </Typography.Text>
            </>
          ) : (
            <Typography.Text type="secondary">请选择左侧文档</Typography.Text>
          )}
        </Header>

        <Layout className="flex-1">
          <Content
            className="overflow-y-auto px-6 py-4 bg-gray-50 prose prose-sm max-w-none"
            ref={contentRef}
            onMouseUp={handleMouseUpInContent}
          >
            <Spin loading={loadingDocContent}>
              {!loadingDocContent && selectedDoc && renderHighlightedMarkdown()}
            </Spin>
          </Content>

          <Sider width={300} className="border-l p-3">
            <div className="text-sm font-semibold mb-2">当前文档高亮</div>

            <div className="mb-3">
              {selection ? (
                <div className="mb-2 border rounded p-2 bg-yellow-50">
                  <div className="text-xs text-gray-600 mb-1">已选中文本：</div>
                  <div className="text-xs max-h-16 overflow-y-auto mb-2">
                    {selection.text}
                  </div>
                  <TextArea
                    placeholder="写一点笔记（可选）"
                    value={highlightNote}
                    onChange={setHighlightNote}
                    rows={2}
                    className="mb-2"
                  />
                  <div className="flex justify-end gap-1">
                    <Button
                      size="mini"
                      onClick={() => {
                        setSelection(null);
                        setHighlightNote("");
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      type="primary"
                      size="mini"
                      onClick={handleSaveHighlight}
                      loading={savingHighlight}
                    >
                      保存高亮
                    </Button>
                  </div>
                </div>
              ) : (
                <Typography.Text type="secondary" className="text-xs">
                  在左侧正文中拖拽选择一段文字，这里可以保存为高亮。
                </Typography.Text>
              )}
            </div>

            <div
              className="overflow-y-auto"
              style={{ height: "calc(100% - 120px)" }}
            >
              <Spin loading={loadingHighlights}>
                {highlights.length === 0 ? (
                  <Empty description="暂无高亮" className="mt-8" />
                ) : (
                  <List
                    dataSource={highlights}
                    render={(item) => (
                      <List.Item
                        key={item.id}
                        className="mb-2 border rounded p-2 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleHighlightClick(item.id)}
                      >
                        <div>
                          <div className="text-xs text-gray-800 mb-1 line-clamp-3">
                            {item.selected_text}
                          </div>
                          {item.note && (
                            <div className="text-xs text-gray-500">
                              笔记：{item.note}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Spin>
            </div>
          </Sider>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default KnowledgeBase;
