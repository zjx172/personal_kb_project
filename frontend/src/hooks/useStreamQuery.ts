import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { queryKnowledgeBaseStream, QueryResponse } from "../api";
import { SearchFilterOptions } from "../components/SearchFilters";
import { Message } from "../types/chat";

export function useStreamQuery(
  currentConversationId: string | null,
  currentKnowledgeBaseId: string | null,
  searchFilters: SearchFilterOptions
) {
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentCitations, setCurrentCitations] = useState<
    QueryResponse["citations"]
  >([]);
  const [currentSourcesCount, setCurrentSourcesCount] = useState(0);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // 流式显示控制
  const streamBufferRef = useRef<string>("");
  const streamTimerRef = useRef<number | null>(null);
  const streamDisplayRef = useRef<string>("");

  // 匀速显示流式内容
  const startStreamDisplay = () => {
    if (streamTimerRef.current) {
      return;
    }

    const displayChunk = () => {
      if (streamBufferRef.current.length > 0) {
        const chunkSize = Math.min(
          Math.max(3, Math.floor(streamBufferRef.current.length / 20)),
          10
        );
        const chunk = streamBufferRef.current.slice(0, chunkSize);
        streamBufferRef.current = streamBufferRef.current.slice(chunkSize);
        streamDisplayRef.current += chunk;
        setCurrentAnswer(streamDisplayRef.current);

        if (streamBufferRef.current.length > 0) {
          streamTimerRef.current = window.setTimeout(displayChunk, 50);
        } else {
          streamTimerRef.current = null;
        }
      } else {
        streamTimerRef.current = null;
      }
    };

    displayChunk();
  };

  const handleStop = (
    messages: Message[],
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setQuerying(false);

    // 将当前答案保存到消息列表
    if (currentAnswer.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: currentAnswer,
        citations: currentCitations,
        sourcesCount: currentSourcesCount,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
    }

    setCurrentAnswer("");
    setCurrentCitations([]);
    setCurrentSourcesCount(0);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";
  };

  const handleQuery = async (
    messages: Message[],
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    onComplete?: () => void,
    overrideConversationId?: string | null
  ) => {
    if (!query.trim()) {
      toast.warning("请输入问题");
      return;
    }

    if (streamTimerRef.current) {
      clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    const currentQuery = query;
    setQuery("");
    setQuerying(true);
    setCurrentAnswer("");
    setCurrentCitations([]);
    setCurrentSourcesCount(0);
    streamBufferRef.current = "";
    streamDisplayRef.current = "";

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentQuery,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // 创建 AbortController 用于停止请求
    const controller = new AbortController();
    setAbortController(controller);

    // 使用传入的 conversationId 或默认的 currentConversationId
    const effectiveConversationId =
      overrideConversationId !== undefined
        ? overrideConversationId
        : currentConversationId;

    try {
      let finalAnswer = "";
      let finalCitations: QueryResponse["citations"] = [];
      let finalSourcesCount = 0;

      await queryKnowledgeBaseStream(
        currentQuery,
        (chunk) => {
          if (chunk.type === "chunk" && chunk.chunk) {
            streamBufferRef.current += chunk.chunk;
            if (!streamTimerRef.current) {
              startStreamDisplay();
            }
          } else if (chunk.type === "citations" && chunk.citations) {
            setCurrentCitations(chunk.citations);
            setCurrentSourcesCount(chunk.citations.length);
            finalCitations = chunk.citations;
            finalSourcesCount = chunk.citations.length;
          } else if (chunk.type === "final") {
            if (streamBufferRef.current.length > 0) {
              streamDisplayRef.current += streamBufferRef.current;
              streamBufferRef.current = "";
              setCurrentAnswer(streamDisplayRef.current);
            }

            if (chunk.answer) {
              finalAnswer = chunk.answer;
              setCurrentAnswer(chunk.answer);
            } else if (streamDisplayRef.current) {
              finalAnswer = streamDisplayRef.current;
            }

            if (chunk.citations) {
              finalCitations = chunk.citations;
              finalSourcesCount = chunk.citations.length;
              setCurrentCitations(chunk.citations);
              setCurrentSourcesCount(chunk.citations.length);
            }

            if (streamTimerRef.current) {
              clearTimeout(streamTimerRef.current);
              streamTimerRef.current = null;
            }

            streamBufferRef.current = "";
          }
        },
        {
          ...searchFilters,
          conversation_id: effectiveConversationId || undefined,
          knowledge_base_id: currentKnowledgeBaseId || undefined,
        }
      );

      // 等待流式显示完成（最多等待2秒）
      let waitCount = 0;
      while (
        (streamTimerRef.current || streamBufferRef.current.length > 0) &&
        waitCount < 20
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        waitCount++;
      }

      // 添加助手消息
      if (finalAnswer) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: finalAnswer,
          citations: finalCitations,
          sourcesCount: finalSourcesCount,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      onComplete?.();
    } catch (e: any) {
      console.error(e);
      if (e.name !== "AbortError") {
        toast.error(e?.message || "搜索失败");
        // 添加错误消息
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "抱歉，搜索过程中出现了错误。请稍后重试。",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    } finally {
      setQuerying(false);
      setAbortController(null);
      setCurrentAnswer("");
      setCurrentCitations([]);
      setCurrentSourcesCount(0);
      streamBufferRef.current = "";
      streamDisplayRef.current = "";
    }
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    querying,
    currentAnswer,
    currentCitations,
    currentSourcesCount,
    handleQuery,
    handleStop,
  };
}
