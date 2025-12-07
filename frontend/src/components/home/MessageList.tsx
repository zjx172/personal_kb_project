import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnswerWithCitations } from "../AnswerWithCitations";
import {
  User,
  ChevronDown,
  Loader2,
  BookOpen,
  Sparkles,
  Search,
} from "lucide-react";
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 relative">
          {/* 装饰性背景元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
            {/* 图标区域 */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-6 rounded-full shadow-lg border border-primary/20">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>

            {/* 标题 */}
            <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
              个人知识库
            </h1>

            {/* 描述文字 */}
            <p className="text-xl text-muted-foreground max-w-md text-center leading-relaxed mb-12">
              在您的知识库中搜索答案，或创建新文档
            </p>

            {/* 功能提示卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                <div className="p-3 rounded-full bg-primary/10 mb-3">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">智能搜索</h3>
                <p className="text-xs text-muted-foreground text-center">
                  快速找到您需要的答案
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                <div className="p-3 rounded-full bg-primary/10 mb-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">文档管理</h3>
                <p className="text-xs text-muted-foreground text-center">
                  创建和组织您的文档
                </p>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md">
                <div className="p-3 rounded-full bg-primary/10 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">AI 助手</h3>
                <p className="text-xs text-muted-foreground text-center">
                  智能问答和内容生成
                </p>
              </div>
            </div>
          </div>
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
