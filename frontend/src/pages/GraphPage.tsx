import React, { useEffect, useState } from "react";
import { Layout, Spin, Message, Card, Typography } from "@arco-design/web-react";
import { getDocsGraph, DocsGraph } from "../api";

const { Content, Header } = Layout;

/**
 * 知识图谱页面：可视化文档之间的关系
 */
const GraphPage: React.FC = () => {
  const [graph, setGraph] = useState<DocsGraph | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await getDocsGraph();
      setGraph(data);
    } catch (e: any) {
      console.error(e);
      Message.error(e?.message || "加载知识图谱失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="h-screen">
      <Header className="h-14 px-4 border-b flex items-center">
        <Typography.Text className="text-lg font-semibold">
          知识图谱
        </Typography.Text>
      </Header>
      <Content className="p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Spin />
          </div>
        ) : graph ? (
          <div>
            <div className="mb-4">
              <Typography.Text className="text-sm text-gray-600">
                共 {graph.nodes.length} 个文档节点，{graph.edges.length} 条关联关系
              </Typography.Text>
            </div>

            {/* 简单的图谱可视化 */}
            <Card>
              <div className="space-y-4">
                {/* 节点列表 */}
                <div>
                  <Typography.Text className="text-base font-semibold mb-2 block">
                    文档节点
                  </Typography.Text>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {graph.nodes.map((node) => (
                      <Card
                        key={node.id}
                        size="small"
                        className="hover:shadow-md transition-shadow"
                      >
                        <div className="text-sm font-medium mb-1">{node.label}</div>
                        <div className="text-xs text-gray-500 mb-2">
                          类型: {node.type || "doc"}
                        </div>
                        {node.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {node.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                {/* 关联关系 */}
                {graph.edges.length > 0 && (
                  <div>
                    <Typography.Text className="text-base font-semibold mb-2 block">
                      文档关联
                    </Typography.Text>
                    <div className="space-y-2">
                      {graph.edges.map((edge, idx) => {
                        const sourceNode = graph.nodes.find((n) => n.id === edge.source);
                        const targetNode = graph.nodes.find((n) => n.id === edge.target);
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
                          >
                            <span className="font-medium">{sourceNode?.label}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium">{targetNode?.label}</span>
                            <span className="text-xs text-gray-500 ml-auto">
                              共同标签: {edge.tags.join(", ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* 提示：可以使用 D3.js 或 vis.js 等库实现更美观的可视化 */}
            <div className="mt-4 text-xs text-gray-500 text-center">
              提示：可以使用 D3.js 或 vis.js 等库实现更美观的图谱可视化
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 mt-8">
            <Typography.Text>暂无数据</Typography.Text>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default GraphPage;

