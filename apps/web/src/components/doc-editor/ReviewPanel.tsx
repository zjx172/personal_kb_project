import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search, X } from "lucide-react";
import { Citation } from "../../api";

interface ReviewPanelProps {
  query: string;
  answer: string;
  citations: Citation[];
  reviewing: boolean;
  onQueryChange: (query: string) => void;
  onQuery: () => void;
  onClose: () => void;
  onCitationClick: (citation: Citation) => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  query,
  answer,
  citations,
  reviewing,
  onQueryChange,
  onQuery,
  onClose,
  onCitationClick,
}) => {
  // 检查答案是否表示找不到相关内容
  const isNoAnswerFound = (answer: string): boolean => {
    if (citations.length === 0) {
      return true;
    }

    const lowerAnswer = answer.toLowerCase();
    return (
      lowerAnswer.includes("知识库中没有相关内容") ||
      lowerAnswer.includes("没有找到") ||
      lowerAnswer.includes("找不到") ||
      lowerAnswer.includes("未找到") ||
      (lowerAnswer.includes("没有") && lowerAnswer.includes("信息"))
    );
  };

  // 渲染答案，将引用标号转换为可点击的链接
  const renderAnswerWithClickableCitations = (answer: string) => {
    const parts = answer.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const citationMatch = part.match(/\[(\d+)\]/);
      if (citationMatch) {
        const citationIndex = parseInt(citationMatch[1], 10);
        const citation = citations.find((c) => c.index === citationIndex);

        if (citation) {
          const citationInfo = [
            citation.title || "文档",
            citation.chunk_position,
            citation.page && `第 ${citation.page} 页`,
            citation.chunk_index !== undefined &&
              `(Chunk #${citation.chunk_index + 1})`,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <span key={index} className="inline-flex items-center gap-1">
              <span
                className="text-primary font-medium cursor-pointer hover:underline relative group"
                onClick={() => onCitationClick(citation)}
                title={`点击查看引用来源: ${citationInfo}`}
              >
                {part}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground border border-border text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                  {citationInfo}
                </span>
              </span>
            </span>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-96 border-l bg-card overflow-y-auto flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">复习知识</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="输入问题，在知识库中查找答案..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onQueryChange(e.target.value)
              }
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onQuery();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={onQuery}
              disabled={reviewing}
              size="sm"
              className="gap-2"
            >
              {reviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              搜索
            </Button>
          </div>
        </div>

        {/* 搜索结果 */}
        {(answer || reviewing) && (
          <div className="mt-4 space-y-4">
            {reviewing && !answer && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">正在搜索...</span>
              </div>
            )}

            {answer && (
              <>
                {/* 答案部分 - 只在有引用时显示 */}
                {citations.length > 0 && !isNoAnswerFound(answer) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold mb-2">AI 回答</h4>
                        {/* 引用来源统计 */}
                        <div className="text-xs text-muted-foreground mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-medium">引用来源：</span>
                          {citations.map((c) => (
                            <span
                              key={c.index}
                              className="inline-flex items-center gap-1"
                            >
                              <span className="text-primary font-medium">
                                [{c.index}]
                              </span>
                              {c.chunk_position && (
                                <span className="text-muted-foreground">
                                  {c.chunk_position}
                                  {c.page && `, 第 ${c.page} 页`}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm leading-relaxed">
                        {renderAnswerWithClickableCitations(answer)}
                        {reviewing && (
                          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 如果没有找到相关内容 */}
                {isNoAnswerFound(answer) && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center py-4">
                        <p className="text-sm text-orange-600">
                          知识库中没有找到相关内容
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 原文引用 - 只在有引用且找到相关内容时显示 */}
                {citations.length > 0 && !isNoAnswerFound(answer) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">原文引用</h4>
                    <div className="space-y-3">
                      {citations.map((citation) => {
                        const isMarkdownDoc =
                          citation.source.startsWith("markdown_doc:");
                        const docId = isMarkdownDoc
                          ? citation.source.replace("markdown_doc:", "")
                          : null;

                        return (
                          <Card
                            key={citation.index}
                            className={`cursor-pointer transition-all ${
                              docId
                                ? "hover:shadow-md hover:border-primary"
                                : ""
                            }`}
                            onClick={() => onCitationClick(citation)}
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col">
                                {/* 引用标号和标题 */}
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                                    {citation.index}
                                  </span>
                                  <div className="flex-1">
                                    {citation.title && (
                                      <p className="text-base font-medium block">
                                        {citation.title}
                                      </p>
                                    )}
                                    {/* 引用来源详细信息 */}
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span className="font-medium">
                                        引用来源：
                                      </span>
                                      {citation.chunk_position && (
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                                          {citation.chunk_position}
                                        </span>
                                      )}
                                      {citation.chunk_index !== undefined && (
                                        <span>
                                          (Chunk #{citation.chunk_index + 1})
                                        </span>
                                      )}
                                      {citation.page && (
                                        <span>第 {citation.page} 页</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* 原文内容 */}
                                <div className="text-sm leading-relaxed bg-muted p-3 rounded border-l-4 border-primary mb-2">
                                  <span>{citation.snippet}</span>
                                </div>

                                {/* 来源信息 */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {isMarkdownDoc
                                      ? "知识库文档"
                                      : citation.source.split("/").pop() ||
                                        citation.source}
                                  </span>
                                  {docId && (
                                    <span className="text-primary hover:underline">
                                      点击查看原文 →
                                    </span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!answer && !reviewing && (
          <div className="text-center text-muted-foreground mt-8">
            <p className="text-sm">输入问题，在知识库中查找准确的答案</p>
          </div>
        )}
      </div>
    </div>
  );
};
