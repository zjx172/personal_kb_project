import React from "react";

import { useHighlights } from "../highlights/useHighlights";
import type { Highlight } from "../highlights/highlightTypes";

export const HighlightLayer = ({
  highlights,
  viewportSize,
}: {
  highlights: Highlight[];
  viewportSize: { width: number; height: number };
}) => {
  const { flashHighlightId } = useHighlights();

  return (
    <div
      className="highlight-layer"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {highlights.map((highlight) =>
        highlight.rects.map((rect, index: number) => {
          const className =
            highlight.id === flashHighlightId
              ? "highlight-block highlight-flash"
              : "highlight-block";
          const id = index === 0 ? `highlight-${highlight.id}` : undefined;

          const left = rect.x * viewportSize.width;
          const top = rect.y * viewportSize.height;
          const width = rect.width * viewportSize.width;
          const height = rect.height * viewportSize.height;

          return (
            <div
              key={`${highlight.id}-${index}`}
              id={id}
              className={className}
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
                background: highlight.color || "rgba(255,230,140,0.6)",
                borderRadius: 2,
              }}
            />
          );
        })
      )}
    </div>
  );
};
