import React, { useCallback, useMemo, useRef, useState } from "react";

import { usePdfContext } from "../pdf/PdfContext";
import { PageList } from "./PageList";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

export const PdfViewer = () => {
  const { numPages } = usePdfContext();
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleVisibleChange = useCallback(
    (pageNumber: number, visible: boolean) => {
      setVisiblePages((prev) => {
        const next = new Set(prev);
        if (visible) {
          next.add(pageNumber);
        } else {
          next.delete(pageNumber);
        }
        return next;
      });
    },
    []
  );

  const visiblePagesArray = useMemo(
    () => Array.from(visiblePages.values()).sort((a, b) => a - b),
    [visiblePages]
  );

  const handleSize = useCallback(
    (pageNumber: number, size: { width: number; height: number }) => {
      setPageHeights((prev) => {
        if (prev[pageNumber] === size.height) return prev;
        return { ...prev, [pageNumber]: size.height };
      });
    },
    []
  );

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
            onVisibleChange={handleVisibleChange}
            visiblePages={visiblePagesArray}
            pageHeights={pageHeights}
            onSize={handleSize}
          />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};
