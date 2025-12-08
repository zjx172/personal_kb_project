import React from "react";

import { PdfPage } from "./PdfPage";

export const PageList = ({
  numPages,
  onVisibleChange,
  visiblePages = [],
  pageHeights = {},
  onSize,
}: {
  numPages: number;
  onVisibleChange?: (pageNumber: number, visible: boolean) => void;
  visiblePages?: number[];
  pageHeights?: Record<number, number>;
  onSize?: (
    pageNumber: number,
    size: { width: number; height: number }
  ) => void;
}) => {
  const renderSet = new Set<number>();
  visiblePages.forEach((p) => {
    renderSet.add(p);
    renderSet.add(p - 1);
    renderSet.add(p + 1);
    renderSet.add(p - 2);
    renderSet.add(p + 2);
  });

  return (
    <div className="py-4">
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => {
        const shouldRender = renderSet.size === 0 || renderSet.has(pageNumber);
        const placeholderHeight = pageHeights[pageNumber] ?? 1200;

        if (!shouldRender) {
          return (
            <div
              key={`placeholder-${pageNumber}`}
              style={{
                height: placeholderHeight,
                margin: "0 auto 16px",
                width: "100%",
              }}
            />
          );
        }

        return (
          <PdfPage
            key={pageNumber}
            pageNumber={pageNumber}
            onVisibleChange={onVisibleChange}
            onSize={onSize}
          />
        );
      })}
    </div>
  );
};
