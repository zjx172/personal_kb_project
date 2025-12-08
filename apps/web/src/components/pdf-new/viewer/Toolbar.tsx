import React from "react";

import { Button } from "../../ui/button";
import { usePdfContext } from "../pdf/PdfContext";

export const Toolbar = () => {
  const { scale, setScale } = usePdfContext();

  const handleZoomOut = () => setScale(Math.max(scale - 0.2, 0.4));
  const handleZoomIn = () => setScale(Math.min(scale + 0.2, 4));
  const handleReset = () => setScale(1.2);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom out"
          onClick={handleZoomOut}
          className="h-9 w-9 rounded-full"
        >
          –
        </Button>
        <span className="w-14 text-center text-sm font-semibold text-gray-700">
          {(scale * 100).toFixed(0)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom in"
          onClick={handleZoomIn}
          className="h-9 w-9 rounded-full"
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="ml-2 text-sm"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};
