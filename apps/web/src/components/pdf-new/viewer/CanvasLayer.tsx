import { useEffect, useRef } from "react";

export const CanvasLayer = ({
  page,
  scale,
  viewportSize,
}: {
  page: any;
  scale: number;
  viewportSize?: { width: number; height: number };
}) => {
  const canvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const viewport = page.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;
    const displayWidth = viewportSize?.width ?? viewport.width;
    const displayHeight = viewportSize?.height ?? viewport.height;

    // Use higher-resolution backing store for clearer rendering on HiDPI screens.
    c.width = Math.floor(displayWidth * outputScale);
    c.height = Math.floor(displayHeight * outputScale);
    c.style.width = `${Math.floor(displayWidth)}px`;
    c.style.height = `${Math.floor(displayHeight)}px`;

    const transform =
      outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    const task = page.render({ canvasContext: ctx, viewport, transform });
    return () => task.cancel();
  }, [page, scale, viewportSize]);

  return (
    <canvas ref={canvas} style={{ position: "absolute", left: 0, top: 0 }} />
  );
};
