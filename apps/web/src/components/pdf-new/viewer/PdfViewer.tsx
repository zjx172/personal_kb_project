import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useHighlights } from "../highlights/useHighlights";
import type { ExtraHighlight } from "../highlights/highlightTypes";
import { usePdfContext } from "../pdf/PdfContext";
import { PageList } from "./PageList";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

const DEFAULT_PAGE_HEIGHT = 1200;
const BUFFER_PX = 800;

interface PdfViewerProps {
  initialPage?: number;
  focusText?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  initialPage,
  focusText,
}) => {
  const { numPages } = usePdfContext();
  const { highlights, registerScrollHandler } = useHighlights();
  const [visiblePages, setVisiblePages] = useState<Set<number>>(
    new Set([1, 2])
  );
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const visiblePagesArray = useMemo(() => {
    const arr = Array.from(visiblePages.values());
    arr.sort((a, b) => a - b);
    return arr;
  }, [visiblePages]);

  const handleSize = useCallback(
    (pageNumber: number, size: { width: number; height: number }) => {
      setPageHeights((prev) => {
        if (prev[pageNumber] === size.height) return prev;
        return { ...prev, [pageNumber]: size.height };
      });
    },
    []
  );

  const getHeightsArray = useCallback(() => {
    return Array.from(
      { length: numPages },
      (_, i) => pageHeights[i + 1] ?? DEFAULT_PAGE_HEIGHT
    );
  }, [numPages, pageHeights]);

  const [virtualHeights, setVirtualHeights] = useState<{
    before: number;
    after: number;
  }>({
    before: 0,
    after: 0,
  });

  const recomputeVisible = useCallback(
    (scrollTop: number, viewportHeight: number) => {
      if (!numPages) return;
      const heights = getHeightsArray();
      const totalHeight = heights.reduce((sum, h) => sum + h, 0);
      const startTarget = Math.max(0, scrollTop - BUFFER_PX);
      const endTarget = scrollTop + viewportHeight + BUFFER_PX;

      let beforeHeight = 0;
      let startIndex = 0;
      for (let i = 0; i < heights.length; i++) {
        const next = beforeHeight + heights[i];
        if (next >= startTarget) {
          startIndex = i;
          break;
        }
        beforeHeight = next;
      }

      const visible: number[] = [];
      let accHeight = beforeHeight;
      for (let i = startIndex; i < heights.length; i++) {
        if (accHeight > endTarget) break;
        visible.push(i + 1);
        accHeight += heights[i];
      }

      const renderedHeight = accHeight - beforeHeight;
      const afterHeight = Math.max(
        0,
        totalHeight - beforeHeight - renderedHeight
      );

      setVisiblePages(new Set(visible));
      setVirtualHeights({ before: beforeHeight, after: afterHeight });
    },
    [getHeightsArray, numPages]
  );

  const scrollRaf = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const top = el.scrollTop;
    const vh = el.clientHeight;
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => recomputeVisible(top, vh));
  }, [recomputeVisible]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    recomputeVisible(el.scrollTop, el.clientHeight);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    };
  }, [handleScroll, recomputeVisible]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    recomputeVisible(el.scrollTop, el.clientHeight);
  }, [recomputeVisible, pageHeights, numPages]);

  const handleExternalScrollToHighlight = useCallback(
    (id: string) => {
      const target = highlights.find((h) => h.id === id);
      if (!target) return;
      const pageIndex = target.pageNumber - 1;
      if (pageIndex < 0) return;

      const heights = getHeightsArray();
      const pageHeight = heights[pageIndex] ?? DEFAULT_PAGE_HEIGHT;
      const pageTop = heights.slice(0, pageIndex).reduce((s, h) => s + h, 0);
      const rect = target.rects?.[0];
      const offsetInPage = rect ? rect.y * pageHeight : 0;
      const targetTop = Math.max(0, pageTop + offsetInPage - 80);

      setVisiblePages((prev) => {
        const next = new Set(prev);
        next.add(pageIndex + 1);
        return next;
      });

      const el = scrollContainerRef.current;
      if (el) {
        el.scrollTo({ top: targetTop, behavior: "smooth" });
      }
    },
    [getHeightsArray, highlights]
  );

  useEffect(() => {
    registerScrollHandler(handleExternalScrollToHighlight);
    return () => registerScrollHandler(null);
  }, [handleExternalScrollToHighlight, registerScrollHandler]);

  const ensurePageVisible = useCallback((pageNumber: number) => {
    if (!pageNumber || pageNumber < 1) return;
    setVisiblePages((prev) => {
      const next = new Set(prev);
      next.add(pageNumber);
      next.add(pageNumber + 1);
      next.add(pageNumber - 1);
      return next;
    });
  }, []);

  const scrollToPageOffset = useCallback(
    (pageNumber: number, offsetY: number = 0) => {
      const heights = getHeightsArray();
      if (pageNumber < 1 || pageNumber > heights.length) return;
      const pageTop = heights
        .slice(0, pageNumber - 1)
        .reduce((s, h) => s + h, 0);
      const targetTop = Math.max(0, pageTop + offsetY - 80);
      ensurePageVisible(pageNumber);
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: targetTop, behavior: "smooth" });
    },
    [ensurePageVisible, getHeightsArray]
  );

  useEffect(() => {
    if (initialPage) {
      ensurePageVisible(initialPage);
    }
  }, [initialPage, ensurePageVisible]);

  useEffect(() => {
    if (!initialPage) return;
    scrollToPageOffset(initialPage, 0);
  }, [initialPage, scrollToPageOffset, pageHeights]);

  const focusHighlights: ExtraHighlight[] = useMemo(() => {
    if (!initialPage || !focusText) return [];
    return [
      {
        id: "__focus",
        pageNumber: initialPage,
        rects: [
          {
            x: 0.08,
            y: 0.08,
            width: 0.84,
            height: 0.03,
          },
        ],
        quoteText: focusText,
        color: "rgba(255,230,140,0.35)",
        createdAt: new Date().toISOString(),
      },
    ];
  }, [initialPage, focusText]);

  if (!numPages) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: "auto", background: "#f3f3f3" }}
        >
          <PageList
            numPages={numPages}
            visiblePages={visiblePagesArray}
            pageHeights={pageHeights}
            beforeHeight={virtualHeights.before}
            afterHeight={virtualHeights.after}
            onSize={handleSize}
            extraHighlights={focusHighlights}
          />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};
