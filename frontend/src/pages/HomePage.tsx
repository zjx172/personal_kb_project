import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layout,
  Input,
  Button,
  List,
  Spin,
  Empty,
  Typography,
  Card,
  Message,
  Divider,
  Popconfirm,
} from "@arco-design/web-react";
import {
  listDocs,
  createDoc,
  deleteDoc,
  MarkdownDocItem,
  queryKnowledgeBase,
  QueryResponse,
} from "../api";

const { Sider, Content, Header } = Layout;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<MarkdownDocItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 知识库搜索相关
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null);
  const [querying, setQuerying] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await listDocs();
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleCreate = async () => {
    try {
      const newDoc = await createDoc({
        title: "未命名文档",
        topic: "general",
        content: "",
      });
      navigate(`/doc/${newDoc.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocClick = (id: string) => {
    navigate(`/doc/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发文档点击
    try {
      await deleteDoc(id);
      Message.success("文档已删除");
      await loadDocs(); // 重新加载文档列表
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "删除失败");
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) {
      Message.warning("请输入问题");
      return;
    }
    setQuerying(true);
    setQueryResult(null);
    try {
      const result = await queryKnowledgeBase(query);
      setQueryResult(result);
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "搜索失败");
    } finally {
      setQuerying(false);
    }
  };

  const handleQueryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <Layout className="h-screen">
      <Header className="h-14 px-4 border-b flex items-center">
        <Typography.Text className="text-lg font-semibold">
          个人学习助手
        </Typography.Text>
      </Header>
      <Layout className="flex-1">
        <Sider width={300} className="border-r p-4">
          <div className="mb-3">
            <Button type="primary" long onClick={handleCreate}>
              新建文档
            </Button>
          </div>
          <div className="text-sm font-semibold mb-2">知识库列表</div>
          <div
            className="overflow-y-auto"
            style={{ height: "calc(100% - 80px)" }}
          >
            <Spin loading={loading} className="w-full">
              {docs.length === 0 ? (
                <Empty description="暂无文档" className="mt-8" />
              ) : (
                <List
                  dataSource={docs}
                  render={(item) => (
                    <List.Item
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50 group"
                      onClick={() => handleDocClick(item.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.title}
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-400">
                            <span>{item.topic}</span>
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
                        <Popconfirm
                          title="确定要删除这个文档吗？"
                          onOk={(e) => handleDelete(item.id, e as any)}
                          onCancel={(e) => e?.stopPropagation()}
                        >
                          <Button
                            type="text"
                            size="mini"
                            status="danger"
                            className="opacity-0 group-hover:opacity-100 ml-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </div>
                    </List.Item>
                  )}
                />
              )}
            </Spin>
          </div>
        </Sider>
        <Content className="flex flex-col items-center justify-center bg-gray-50 p-8">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <Typography.Title heading={2} className="mb-2">
                个人学习助手
              </Typography.Title>
              <Typography.Text type="secondary">
                在您的知识库中搜索答案
              </Typography.Text>
            </div>

            <div className="mb-6">
              <Input
                size="large"
                placeholder="输入您的问题，在知识库中搜索..."
                value={query}
                onChange={setQuery}
                onKeyPress={handleQueryKeyPress}
                style={{
                  height: 56,
                  fontSize: 16,
                }}
                suffix={
                  <Button
                    type="primary"
                    loading={querying}
                    onClick={handleQuery}
                    style={{ marginRight: -8 }}
                  >
                    搜索
                  </Button>
                }
              />
            </div>

            {queryResult && (
              <Card className="mt-6">
                <div className="mb-4">
                  <Typography.Text className="text-base font-semibold">
                    答案：
                  </Typography.Text>
                </div>
                <div className="mb-4 text-gray-700 whitespace-pre-wrap">
                  {queryResult.answer}
                </div>

                {queryResult.citations.length > 0 && (
                  <>
                    <Divider />
                    <div className="mb-2">
                      <Typography.Text className="text-sm font-semibold">
                        参考来源：
                      </Typography.Text>
                    </div>
                    <div className="space-y-2">
                      {queryResult.citations.map((citation) => (
                        <Card
                          key={citation.index}
                          size="small"
                          className="bg-gray-50"
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            [{citation.index}] {citation.source}
                          </div>
                          <div className="text-sm text-gray-700">
                            {citation.snippet}...
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}

            {!queryResult && !querying && (
              <div className="text-center text-gray-400 mt-8">
                <Typography.Text>
                  在知识库中搜索您的问题，或选择左侧文档进行编辑
                </Typography.Text>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HomePage;
