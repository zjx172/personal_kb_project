import React from "react";

import type { Highlight } from "../highlights/highlightTypes";
import { PdfPage } from "./PdfPage";

export const PageList = ({
  numPages,
  visiblePages = [],
  pageHeights = {},
  onSize,
  beforeHeight = 0,
  afterHeight = 0,
  extraHighlights = [],
}: {
  numPages: number;
  visiblePages?: number[];
  pageHeights?: Record<number, number>;
  onSize?: (
    pageNumber: number,
    size: { width: number; height: number }
  ) => void;
  beforeHeight?: number;
  afterHeight?: number;
  extraHighlights?: Highlight[];
}) => {
  return (
    <div className="py-4" style={{ position: "relative" }}>
      {beforeHeight > 0 && <div style={{ height: beforeHeight }} />}
      {visiblePages.map((pageNumber) => (
        <PdfPage
          key={pageNumber}
          pageNumber={pageNumber}
          onSize={onSize}
          extraHighlights={extraHighlights.filter(
            (h) => h.pageNumber === pageNumber
          )}
        />
      ))}
      {afterHeight > 0 && <div style={{ height: afterHeight }} />}
    </div>
  );
};
