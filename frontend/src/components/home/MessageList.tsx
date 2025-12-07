import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnswerWithCitations } from "../AnswerWithCitations";
import { User, ChevronDown, Loader2 } from "lucide-react";
import { Message } from "../../types/chat";
import { QueryResponse } from "../../api";

interface MessageListProps {
  messages: Message[];
  querying: boolean;
  currentAnswer: string;
  currentCitations: QueryResponse["citations"];
  currentSourcesCount: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  querying,
  currentAnswer,
  currentCitations,
  currentSourcesCount,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 空状态 - 只在没有消息时显示 */}
      {messages.length === 0 && !querying && (
        <div className="flex flex-col items-center justify-center h-full py-16">
          <h1 className="text-4xl font-bold tracking-tight mb-3">个人知识库</h1>
          <p className="text-lg text-muted-foreground mb-8">
            在您的知识库中搜索答案，或创建新文档
          </p>
        </div>
      )}

      {/* 显示对话消息 */}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-4 ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {message.role === "assistant" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
          )}
          <div
            className={`flex flex-col gap-2 max-w-[80%] ${
              message.role === "user" ? "items-end" : "items-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">AI 助手</span>
                {message.sourcesCount !== undefined &&
                  message.sourcesCount > 0 && (
                    <div className="flex items-center gap-1">
                      <ChevronDown className="h-3 w-3" />
                      <span>浏览了 {message.sourcesCount} 个来源</span>
                    </div>
                  )}
              </div>
            )}
            <Card
              className={`${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              }`}
            >
              <CardContent className="p-4">
                {message.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <AnswerWithCitations
                      answer={message.content}
                      citations={message.citations || []}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {message.role === "user" && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}

      {/* 当前正在生成的答案 */}
      {querying && (
        <div className="flex gap-4 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="flex flex-col gap-2 max-w-[80%] items-start">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">AI 助手</span>
              {currentSourcesCount > 0 && (
                <div className="flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" />
                  <span>浏览了 {currentSourcesCount} 个来源</span>
                </div>
              )}
            </div>
            <Card className="bg-card">
              <CardContent className="p-4">
                <div className="prose prose-sm max-w-none">
                  {currentAnswer ? (
                    <AnswerWithCitations
                      answer={currentAnswer}
                      citations={currentCitations}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">正在思考...</span>
                    </div>
                  )}
                  {currentAnswer && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
