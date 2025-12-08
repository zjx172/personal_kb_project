import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePdfContext } from "../pdf/PdfContext";
import { PageList } from "./PageList";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

const DEFAULT_PAGE_HEIGHT = 1200;
const BUFFER_PX = 800;

export const PdfViewer = () => {
  const { numPages } = usePdfContext();
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
          />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};
