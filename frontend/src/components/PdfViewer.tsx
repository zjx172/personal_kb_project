import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "./ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
} from "lucide-react";

// Configure PDF.js worker - use worker from pdfjs-dist
// @ts-ignore - Vite handles ?url imports
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerProps {
  url: string;
  title?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.5);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("PDF 加载失败:", error);
    setError(error.message || "无法加载 PDF 文件");
    setLoading(false);
  }

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
        </div>
      </div>

      {/* PDF 内容区域 */}
      <div className="flex-1 overflow-auto bg-gray-200 p-6">
        <div className="flex justify-center">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">正在加载 PDF...</p>
              </div>
            </div>
          )}
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    正在加载 PDF...
                  </p>
                </div>
              </div>
            }
            className="flex justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              className="shadow-2xl rounded-sm"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>

      {/* 页面缩略图导航（可选） */}
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
