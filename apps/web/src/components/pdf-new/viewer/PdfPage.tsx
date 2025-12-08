import React, { useRef } from "react";

import { useHighlights } from "../highlights/useHighlights";
import { usePdfPage } from "../pdf/usePdfPage";
import { CanvasLayer } from "./CanvasLayer";
import { HighlightLayer } from "./HighlightLayer";
import { TextLayer } from "./TextLayer";

export const PdfPage = ({ pageNumber }: { pageNumber: number }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { page, viewportSize, scale } = usePdfPage(pageNumber);
  const { getHighlightsForPage, createHighlightFromSelection } =
    useHighlights();

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
        highlights={getHighlightsForPage(pageNumber)}
        viewportSize={viewportSize}
      />
    </div>
  );
};
