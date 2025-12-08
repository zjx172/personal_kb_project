import React from "react";

import { Button } from "../../ui/button";
import { useHighlights } from "../highlights/useHighlights";
import type { Highlight } from "../highlights/highlightTypes";

export const HighlightLayer = ({
  highlights,
  viewportSize,
}: {
  highlights: Highlight[];
  viewportSize: { width: number; height: number };
}) => {
  const {
    flashHighlightId,
    selectedHighlightId,
    selectHighlight,
    deleteHighlight,
  } = useHighlights();

  return (
    <div
      className="highlight-layer"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {highlights.map((highlight) =>
        highlight.rects.map((rect, index: number) => {
          const isSelected = selectedHighlightId === highlight.id;
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
            <React.Fragment key={`${highlight.id}-${index}`}>
              <div
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
                  pointerEvents: "auto",
                  userSelect: "none",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectHighlight(highlight.id);
                }}
              />
              {index === 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: Math.max(0, top - 32),
                    left: left + width - 64,
                    zIndex: 5,
                    pointerEvents: "auto",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectHighlight(highlight.id);
                  }}
                >
                  {isSelected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 bg-white/80 border border-red-200 shadow-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteHighlight(highlight.id);
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })
      )}
    </div>
  );
};
