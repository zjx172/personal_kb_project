import React, { useEffect, useState, useRef } from "react";
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
import type { MarkdownDocDetail, MarkdownDocItem } from "../../generated/api";
import { listDocs, createDoc, getDoc, updateDoc } from "../../api";
import { useAuth } from "../../contexts/AuthContext";

const { Sider, Content, Header } = Layout;
const { TextArea } = Input;

const DocEditor: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<MarkdownDocDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState("");
  const [contentDraft, setContentDraft] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);

  const loadList = async () => {
    setLoadingList(true);
    try {
      const data = await listDocs();
      setDocs(data);
      if (!selectedId && data?.length > 0) {
        await openDoc(Number(data?.[0]?.id));
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
      // 如果标题是"未命名文档"，显示时设为空字符串（显示占位符）
      setTitleDraft(detail.title === "未命名文档" ? "" : detail.title);
      setContentDraft(detail.content);
      setLastSavedTime(new Date(detail.updated_at));
      setIsEditingTitle(false);
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
      // 新建文档后自动进入标题编辑模式
      setIsEditingTitle(true);
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 0);
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
      // 如果标题为空，保存时使用"未命名文档"
      const titleToSave = titleDraft.trim() || "未命名文档";
      const detail = await updateDoc(selectedId, {
        title: titleToSave,
        content: contentDraft,
      });
      setCurrentDoc(detail);
      // 如果保存的是"未命名文档"，显示时保持为空
      setTitleDraft(titleToSave === "未命名文档" ? "" : titleToSave);
      setLastSavedTime(new Date());
      await loadList();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTitleClick = () => {
    if (!selectedId) return;
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    // 检查是否有变化：需要考虑 titleDraft 为空但 currentDoc.title 是"未命名文档"的情况
    const currentTitle = currentDoc?.title === "未命名文档" ? "" : currentDoc?.title || "";
    const hasTitleChange = titleDraft.trim() !== currentTitle.trim();
    const hasContentChange = contentDraft !== currentDoc?.content;
    if (selectedId && (hasTitleChange || hasContentChange)) {
      handleSave();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleInputRef.current?.blur();
    }
    if (e.key === "Escape") {
      if (currentDoc) {
        // 如果原标题是"未命名文档"，恢复时设为空字符串
        setTitleDraft(currentDoc.title === "未命名文档" ? "" : currentDoc.title);
      }
      setIsEditingTitle(false);
    }
  };

  // 自动保存功能（仅在非编辑标题状态下；滚动时不触发）
  useEffect(() => {
    if (!selectedId || !currentDoc || isEditingTitle || isScrollingRef.current)
      return;
    
    // 检查标题变化：需要考虑 titleDraft 为空但 currentDoc.title 是"未命名文档"的情况
    const currentTitle = currentDoc.title === "未命名文档" ? "" : currentDoc.title;
    const hasTitleChange = titleDraft.trim() !== currentTitle.trim();
    const hasContentChange = contentDraft !== currentDoc.content;
    if (!hasTitleChange && !hasContentChange) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 2000); // 2秒后自动保存

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleDraft, contentDraft, selectedId, currentDoc, isEditingTitle]);

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const handleScroll = () => {
    isScrollingRef.current = true;
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 300);
  };

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
        {/* 顶部导航栏 - 显示文档名称和保存状态 */}
        <Header className="h-14 px-6 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700">
              {currentDoc ? (currentDoc.title === "未命名文档" ? "未命名文档" : currentDoc.title) : ""}
          </div>
            {currentDoc && (
              <div className="text-xs text-gray-500">
                {(() => {
                  const currentTitle = currentDoc.title === "未命名文档" ? "" : currentDoc.title || "";
                  const hasTitleChange = titleDraft.trim() !== currentTitle.trim();
                  const hasContentChange = contentDraft !== currentDoc.content;
                  return hasTitleChange || hasContentChange ? (
                    <span className="text-blue-500">保存中...</span>
                  ) : (
                    <span>已经保存到云端</span>
                  );
                })()}
              </div>
            )}
          </div>
        </Header>

        {error && (
          <div className="px-4 py-2 border-b">
            <Message type="error" content={error} />
          </div>
        )}

        {/* 主内容区域 - 标题、作者信息和编辑区域 */}
        <Content className="flex-1 overflow-hidden bg-white flex flex-col">
          {!currentDoc ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-400 mb-6" style={{ minHeight: "56px", lineHeight: "1.2" }}>
                  请输入标题
                </div>
                <div className="text-sm text-gray-400">
                  请选择左侧文档，或新建一个
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 标题和作者信息区域 */}
              <div className="flex-shrink-0 px-8 pt-12 pb-6">
                <div className="max-w-4xl mx-auto">
                  {/* 标题区域 - 居中显示 */}
                  <div className="text-center mb-6">
                    {isEditingTitle ? (
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        placeholder="请输入标题"
                        className="w-full text-4xl font-bold outline-none text-center"
                        style={{
                          fontSize: "36px",
                          fontWeight: 600,
                          padding: "12px 16px",
                          border: "2px solid #1890ff",
                          borderRadius: "6px",
                        }}
                      />
                    ) : (
                      <div
                        onClick={handleTitleClick}
                        className={`text-4xl font-bold cursor-text hover:bg-gray-50 rounded px-4 py-3 -mx-4 -my-3 transition-colors inline-block ${
                          titleDraft ? "text-gray-900" : "text-gray-400"
                        }`}
                        style={{ minHeight: "56px", lineHeight: "1.2" }}
                      >
                        {titleDraft || "请输入标题"}
                      </div>
                    )}
                  </div>

                  {/* 作者信息 - 头像、用户名、修改时间 */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name || user.email}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-600">
                        {(user?.name || user?.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-gray-700">{user?.name || user?.email || "用户"}</span>
                    <span className="text-gray-400">·</span>
                    <span>
                      {(() => {
                        const updateTime = lastSavedTime || new Date(currentDoc.updated_at);
                        const now = new Date();
                        const diff = now.getTime() - updateTime.getTime();
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        
                        if (days === 0) {
                          return "今天修改";
                        } else if (days === 1) {
                          return "昨天修改";
                        } else if (days < 7) {
                          return `${days}天前修改`;
                        } else {
                          return updateTime.toLocaleDateString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                          });
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 编辑和预览区域 */}
              <div className="flex-1 overflow-hidden border-t">
            <Layout className="h-full">
              <Sider width="50%" className="border-r">
                <div className="h-8 px-3 flex items-center text-xs text-gray-500 border-b bg-gray-50">
                  Markdown 编辑
                </div>
                <TextArea
                  value={contentDraft}
                  onChange={setContentDraft}
                  onScroll={handleScroll}
                      placeholder="输入"/"快速插入内容"
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
                <div className="overflow-y-auto px-4 py-3 h-full" onScroll={handleScroll}>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(contentDraft || "*（暂无内容）*"),
                    }}
                  />
                </div>
              </Content>
            </Layout>
              </div>
            </>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DocEditor;
