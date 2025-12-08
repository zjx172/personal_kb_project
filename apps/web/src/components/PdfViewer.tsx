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

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const highlightCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const processingSelectionRef = useRef<boolean>(false);
  const lastProcessedSelectionRef = useRef<string>("");

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
      textLayer.style.zIndex = "10";
      textLayer.style.pointerEvents = "auto";
      textLayer.style.userSelect = "text";
      (textLayer.style as any).webkitUserSelect = "text";
      (textLayer.style as any).mozUserSelect = "text";
      (textLayer.style as any).msUserSelect = "text";

      // 使用PDF.js的文本层渲染
      // 创建文本层容器
      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;
      textLayerDiv.style.position = "absolute";
      textLayerDiv.style.top = "0";
      textLayerDiv.style.left = "0";
      textLayerDiv.style.overflow = "visible";
      textLayerDiv.style.opacity = "1";
      textLayerDiv.style.userSelect = "text";
      (textLayerDiv.style as any).webkitUserSelect = "text";
      (textLayerDiv.style as any).mozUserSelect = "text";
      (textLayerDiv.style as any).msUserSelect = "text";
      textLayerDiv.style.lineHeight = "1";
      textLayerDiv.style.pointerEvents = "auto";
      textLayerDiv.style.zIndex = "10";

      // 渲染文本项
      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          const textDiv = document.createElement("span");
          textDiv.textContent = item.str;
          textDiv.style.position = "absolute";
          textDiv.style.whiteSpace = "pre";
          textDiv.style.cursor = "text";
          // 使用非常浅的颜色，但仍然可见以便调试
          textDiv.style.color = "rgba(0, 0, 0, 0.01)";
          textDiv.style.userSelect = "text";
          (textDiv.style as any).webkitUserSelect = "text";
          (textDiv.style as any).mozUserSelect = "text";
          (textDiv.style as any).msUserSelect = "text";
          textDiv.style.pointerEvents = "auto";
          textDiv.style.fontSize = `${item.height || 12}px`;
          textDiv.style.fontFamily = item.fontName || "sans-serif";
          textDiv.style.lineHeight = "1";
          textDiv.style.display = "inline-block";

          // PDF坐标系转换：PDF原点在左下角，HTML在左上角
          // transform[4] = x, transform[5] = y (PDF坐标系)
          const tx = item.transform[4];
          const ty = item.transform[5];
          const itemHeight = item.height || 12;
          const itemWidth = item.width || 0;

          // 转换为HTML坐标系
          const htmlX = tx;
          const htmlY = viewport.height - ty - itemHeight;

          textDiv.style.left = `${htmlX}px`;
          textDiv.style.top = `${htmlY}px`;
          if (itemWidth > 0) {
            textDiv.style.width = `${itemWidth}px`;
          }
          textDiv.style.height = `${itemHeight}px`;

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

  // 处理文本选择 - 监听全局选择事件
  useEffect(() => {
    if (!docId) return;

    const handleMouseUp = async () => {
      // 如果正在处理，跳过
      if (processingSelectionRef.current) {
      return;
      }

      // 延迟检查，等待浏览器完成文本选择
      setTimeout(async () => {
    const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 1) {
          return;
        }

        // 检查是否与上次处理的选择相同
        const selectionKey = `${selectedText}-${Date.now()}`;
        if (lastProcessedSelectionRef.current === selectionKey) {
          return;
        }

        // 检查选中的文本是否在PDF文本层中
        const range = selection.getRangeAt(0);
        let textLayerElement: HTMLElement | null = null;

        // 查找文本层元素 - 从选中的节点向上查找
        let node: Node | null = range.commonAncestorContainer;
        while (node && node !== document.body) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            // 检查是否是textLayer或其子元素
            if (el.classList?.contains("textLayer")) {
              textLayerElement = el;
              break;
            }
            // 检查父元素
            const parent = el.parentElement;
            if (parent?.classList?.contains("textLayer")) {
              textLayerElement = parent;
              break;
            }
            // 使用closest查找
            const closest = el.closest(".textLayer");
            if (closest) {
              textLayerElement = closest as HTMLElement;
              break;
            }
          }
          node = node.parentNode;
        }

        if (!textLayerElement) {
          return;
        }

        // 找到选中的文本所在的页面
        let pageNum = 1;
        for (const [page, textLayerEl] of textLayerRefs.current.entries()) {
          if (
            textLayerEl &&
            (textLayerEl === textLayerElement ||
              textLayerEl.contains(textLayerElement))
          ) {
            pageNum = page;
            break;
          }
        }

        // 标记为正在处理
        processingSelectionRef.current = true;
        lastProcessedSelectionRef.current = selectionKey;

        try {
          // 检查是否已经存在相同的高亮
          const existingHighlight = highlights.find(
            (h) => h.page === pageNum && h.selected_text === selectedText
          );

          if (existingHighlight) {
            processingSelectionRef.current = false;
            return; // 已存在，不重复创建
          }

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

          // 清除选择
          selection.removeAllRanges();
      } catch (err: any) {
        console.error("保存高亮失败:", err);
        toast.error(err?.message || "保存高亮失败");
        } finally {
          processingSelectionRef.current = false;
        }
      }, 300);
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
  };
  }, [docId, highlights]);

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
      <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200 p-6">
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
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current.set(pageNum, el);
                    }}
                    className="block"
                    style={{ pointerEvents: "none" }}
                  />
                  <canvas
                    ref={(el) => {
                      if (el) highlightCanvasRefs.current.set(pageNum, el);
                    }}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{ mixBlendMode: "multiply", zIndex: 1 }}
                  />
                  <div
                    ref={(el) => {
                      if (el) textLayerRefs.current.set(pageNum, el);
                    }}
                    className="absolute top-0 left-0 textLayer"
                    style={
                      {
                      userSelect: "text",
                        WebkitUserSelect: "text" as any,
                        MozUserSelect: "text" as any,
                        msUserSelect: "text" as any,
                        pointerEvents: "auto",
                        zIndex: 10,
                        width: "100%",
                        height: "100%",
                      } as React.CSSProperties
                    }
                    />
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
