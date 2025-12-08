import { useEffect, useState } from 'react';

import { usePdfContext } from './PdfContext';

export const usePdfPage = (pageNumber: number) => {
  const { pdfDoc, scale } = usePdfContext();
  const [page, setPage] = useState<any>(null);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    (async () => {
      const p = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;
      const v = p.getViewport({ scale });
      setPage(p);
      setViewportSize({ width: v.width, height: v.height });
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, scale]);

  return { page, viewportSize, scale };
};
