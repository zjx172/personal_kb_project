import React, { useEffect, useRef } from "react";

import { useHighlights } from "../highlights/useHighlights";
import type { Highlight } from "../highlights/highlightTypes";
import { usePdfPage } from "../pdf/usePdfPage";
import { CanvasLayer } from "./CanvasLayer";
import { HighlightLayer } from "./HighlightLayer";
import { TextLayer } from "./TextLayer";

export const PdfPage = ({
  pageNumber,
  onSize,
  extraHighlights = [],
}: {
  pageNumber: number;
  onSize?: (
    pageNumber: number,
    size: { width: number; height: number }
  ) => void;
  extraHighlights?: Highlight[];
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { page, viewportSize, scale } = usePdfPage(pageNumber);
  const { getHighlightsForPage, createHighlightFromSelection } =
    useHighlights();

  useEffect(() => {
    if (!viewportSize || !onSize) return;
    onSize(pageNumber, viewportSize);
  }, [viewportSize, onSize, pageNumber]);

  useEffect(() => {
    // no-op: visibility handled by parent virtualizer
    return;
  }, []);

  if (!page || !viewportSize) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: viewportSize.width,
        height: viewportSize.height,
        margin: "0 auto 16px",
        background: "#fff",
        boxShadow: "0 0 4px rgba(0,0,0,0.2)",
      }}
      onMouseUp={() =>
        ref.current &&
        createHighlightFromSelection({ pageNumber, pageContainer: ref.current })
      }
    >
      <CanvasLayer page={page} viewportSize={viewportSize} scale={scale} />
      <TextLayer page={page} viewportSize={viewportSize} scale={scale} />
      <HighlightLayer
        highlights={[...getHighlightsForPage(pageNumber), ...extraHighlights]}
        viewportSize={viewportSize}
      />
    </div>
  );
};
