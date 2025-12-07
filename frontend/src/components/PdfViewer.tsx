import React, { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  Highlighter,
} from "lucide-react";
import { createHighlight, listHighlights, Highlight } from "../api";
import { toast } from "sonner";

// 配置 PDF.js worker
// @ts-ignore
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerProps {
  url: string;
  title?: string;
  docId?: string; // 文档ID，用于保存高亮
}

interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  text: string;
  highlightId?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, docId }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
    page: number;
  } | null>(null);
  const [currentSelection, setCurrentSelection] =
    useState<HighlightRect | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const highlightCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 加载PDF文档
  useEffect(() => {
    const loadPdf = async () => {
      setLoading(true);
      setError(null);
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setPageNumber(1);
      } catch (err: any) {
        console.error("PDF加载失败:", err);
        setError(err.message || "无法加载PDF文件");
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [url]);

  // 加载高亮数据
  useEffect(() => {
    if (docId) {
      const loadHighlights = async () => {
        try {
          const data = await listHighlights({
            source: `markdown_doc:${docId}`,
          });
          setHighlights(data);
        } catch (err) {
          console.error("加载高亮失败:", err);
        }
      };
      loadHighlights();
    }
  }, [docId]);

  // 渲染PDF页面
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDocument) return;

      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRefs.current.get(pageNum);
      const highlightCanvas = highlightCanvasRefs.current.get(pageNum);
      const textLayer = textLayerRefs.current.get(pageNum);
      const pageDiv = pageRefs.current.get(pageNum);

      if (!canvas || !highlightCanvas || !textLayer || !pageDiv) return;

      // 设置canvas尺寸（使用设备像素比以获得清晰显示）
      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      highlightCanvas.width = viewport.width * dpr;
      highlightCanvas.height = viewport.height * dpr;

      // 设置canvas显示尺寸
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      highlightCanvas.style.width = `${viewport.width}px`;
      highlightCanvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d");
      const highlightCtx = highlightCanvas.getContext("2d");

      if (!ctx || !highlightCtx) return;

      // 缩放上下文以匹配设备像素比
      ctx.scale(dpr, dpr);
      highlightCtx.scale(dpr, dpr);

      // 渲染PDF页面
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // 渲染文本层（用于文本选择）
      const textContent = await page.getTextContent();
      textLayer.innerHTML = "";
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;
      textLayer.style.position = "absolute";
      textLayer.style.top = "0";
      textLayer.style.left = "0";
      textLayer.style.overflow = "hidden";

      // 手动创建文本元素用于文本选择
      // 使用PDF.js的文本层渲染工具
      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.position = "absolute";
      textLayerDiv.style.top = "0";
      textLayerDiv.style.left = "0";
      textLayerDiv.style.overflow = "hidden";
      textLayerDiv.style.opacity = "0.2";
      textLayerDiv.style.userSelect = "text";
      textLayerDiv.style.lineHeight = "1";

      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          const textDiv = document.createElement("span");
          textDiv.textContent = item.str;
          textDiv.style.position = "absolute";
          textDiv.style.whiteSpace = "pre";
          textDiv.style.cursor = "text";
          textDiv.style.color = "transparent";

          // PDF坐标系转换：PDF原点在左下角，HTML在左上角
          // transform[4] = x, transform[5] = y (PDF坐标系)
          const tx = item.transform[4];
          const ty = item.transform[5];
          const itemHeight = item.height || 12;

          // 转换为HTML坐标系
          textDiv.style.left = `${tx}px`;
          textDiv.style.top = `${viewport.height - ty - itemHeight}px`;
          textDiv.style.fontSize = `${itemHeight}px`;
          textDiv.style.fontFamily = item.fontName || "sans-serif";
          textDiv.style.width = `${item.width || 100}px`;

          textLayerDiv.appendChild(textDiv);
        }
      });

      textLayer.appendChild(textLayerDiv);

      // 渲染该页的高亮
      renderHighlightsForPage(pageNum, highlightCtx, viewport);
    },
    [pdfDocument, scale, rotation]
  );

  // 渲染指定页面的高亮
  const renderHighlightsForPage = (
    pageNum: number,
    ctx: CanvasRenderingContext2D,
    viewport: any
  ) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);

    const pageHighlights = highlightRects.filter((h) => h.page === pageNum);
    pageHighlights.forEach((highlight) => {
      ctx.fillStyle = "rgba(255, 235, 59, 0.3)"; // 黄色半透明
      ctx.fillRect(highlight.x, highlight.y, highlight.width, highlight.height);
    });
  };

  // 当页面、缩放或旋转变化时重新渲染所有页面
  useEffect(() => {
    if (pdfDocument) {
      // 渲染所有页面，而不仅仅是当前页
      for (let i = 1; i <= numPages; i++) {
        renderPage(i);
      }
    }
  }, [pdfDocument, numPages, scale, rotation, renderPage]);

  // 从高亮数据生成高亮矩形
  useEffect(() => {
    if (!pdfDocument || highlights.length === 0) {
      setHighlightRects([]);
      return;
    }

    const processHighlights = async () => {
      const rects: HighlightRect[] = [];

      for (const highlight of highlights) {
        if (highlight.page === null || highlight.page === undefined) continue;

        try {
          const page = await pdfDocument.getPage(highlight.page);
          const viewport = page.getViewport({ scale, rotation });
          const textContent = await page.getTextContent();

          // 查找包含选中文本的文本项
          const searchText = highlight.selected_text.toLowerCase();
          let found = false;

          for (const item of textContent.items) {
            if (item.str && item.str.toLowerCase().includes(searchText)) {
              // 计算文本位置
              const transform = item.transform;
              const x = transform[4];
              const y = viewport.height - transform[5]; // PDF坐标系需要转换
              const width = item.width || 100;
              const height = item.height || 20;

              rects.push({
                x: x * (scale / 1.0),
                y: y * (scale / 1.0) - height * (scale / 1.0),
                width: width * (scale / 1.0),
                height: height * (scale / 1.0),
                page: highlight.page,
                text: highlight.selected_text,
                highlightId: highlight.id,
              });
              found = true;
              break;
            }
          }

          if (!found) {
            // 如果找不到精确匹配，尝试在页面中间位置显示
            rects.push({
              x: viewport.width * 0.1,
              y: viewport.height * 0.5,
              width: viewport.width * 0.8,
              height: 20 * scale,
              page: highlight.page,
              text: highlight.selected_text,
              highlightId: highlight.id,
            });
          }
        } catch (err) {
          console.error(`处理第${highlight.page}页高亮失败:`, err);
        }
      }

      setHighlightRects(rects);
    };

    processHighlights();
  }, [pdfDocument, highlights, scale, rotation]);

  // 重新渲染所有高亮
  useEffect(() => {
    if (pdfDocument && highlightRects.length > 0) {
      highlightRects.forEach((rect) => {
        const highlightCanvas = highlightCanvasRefs.current.get(rect.page);
        if (highlightCanvas) {
          pdfDocument.getPage(rect.page).then((page: any) => {
            const viewport = page.getViewport({ scale, rotation });
            const ctx = highlightCanvas.getContext("2d");
            if (ctx) {
              renderHighlightsForPage(rect.page, ctx, viewport);
            }
          });
        }
      });
    }
  }, [highlightRects, pdfDocument, scale, rotation]);

  // 处理文本选择
  const handleMouseDown = (e: React.MouseEvent, pageNum: number) => {
    if (e.button !== 0) return; // 只处理左键

    const pageDiv = pageRefs.current.get(pageNum);
    if (!pageDiv) return;

    const rect = pageDiv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y, page: pageNum });
  };

  const handleMouseMove = (e: React.MouseEvent, pageNum: number) => {
    if (!isSelecting || !selectionStart || selectionStart.page !== pageNum)
      return;

    const pageDiv = pageRefs.current.get(pageNum);
    if (!pageDiv) return;

    const rect = pageDiv.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const startX = Math.min(selectionStart.x, x);
    const startY = Math.min(selectionStart.y, y);
    const width = Math.abs(x - selectionStart.x);
    const height = Math.abs(y - selectionStart.y);

    setCurrentSelection({
      x: startX,
      y: startY,
      width,
      height,
      page: pageNum,
      text: "", // 稍后从文本层提取
    });
  };

  const handleMouseUp = async (e: React.MouseEvent, pageNum: number) => {
    if (!isSelecting || !selectionStart) return;

    setIsSelecting(false);

    // 获取选中的文本
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";

    if (selectedText && docId) {
      try {
        // 保存高亮
        const highlight = await createHighlight({
          source: `markdown_doc:${docId}`,
          page: pageNum,
          selected_text: selectedText,
          note: null,
        });

        // 添加到高亮列表
        setHighlights((prev) => [highlight, ...prev]);
        toast.success("高亮已保存");
      } catch (err: any) {
        console.error("保存高亮失败:", err);
        toast.error(err?.message || "保存高亮失败");
      }
    }

    setSelectionStart(null);
    setCurrentSelection(null);
    selection?.removeAllRanges();
  };

  const goToPreviousPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = title || "document.pdf";
    link.click();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[80px] text-center text-gray-700">
            {pageNumber} / {numPages || "..."}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[60px] text-center text-gray-700">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={rotate}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            className="rounded-full border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
          </Button>
          {docId && (
            <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
              <Highlighter className="h-3 w-3" />
              <span>选择文本即可高亮</span>
            </div>
          )}
        </div>
      </div>

      {/* PDF 内容区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-200 p-6"
        onMouseUp={(e) => {
          // 全局鼠标抬起事件，清除选择状态
          if (isSelecting) {
            setIsSelecting(false);
            setSelectionStart(null);
            setCurrentSelection(null);
          }
        }}
      >
        <div className="flex flex-col items-center gap-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">正在加载 PDF...</p>
              </div>
            </div>
          )}

          {pdfDocument &&
            Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              return (
                <div
                  key={pageNum}
                  ref={(el) => {
                    if (el) pageRefs.current.set(pageNum, el);
                  }}
                  className="relative shadow-2xl rounded-sm bg-white"
                  onMouseDown={(e) => handleMouseDown(e, pageNum)}
                  onMouseMove={(e) => handleMouseMove(e, pageNum)}
                  onMouseUp={(e) => handleMouseUp(e, pageNum)}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                    }}
                    className="block"
                  />
                  <canvas
                    ref={(el) => {
                      if (el) highlightCanvasRefs.current.set(pageNum, el);
                    }}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ mixBlendMode: "multiply" }}
                  />
                  <div
                    ref={(el) => {
                      if (el) textLayerRefs.current.set(pageNum, el);
                    }}
                    className="absolute top-0 left-0 textLayer"
                    style={{
                      opacity: 0.2,
                      userSelect: "text",
                    }}
                  />
                  {currentSelection && currentSelection.page === pageNum && (
                    <div
                      className="absolute bg-yellow-300 opacity-30 pointer-events-none"
                      style={{
                        left: `${currentSelection.x}px`,
                        top: `${currentSelection.y}px`,
                        width: `${currentSelection.width}px`,
                        height: `${currentSelection.height}px`,
                      }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 页面缩略图导航 */}
      {numPages > 1 && (
        <div className="border-t border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto">
            {Array.from({ length: Math.min(numPages, 10) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    pageNumber === pageNum
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-md"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {numPages > 10 && (
              <span className="px-3 py-1.5 text-xs text-gray-500">...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
