import React, { useEffect, useState } from 'react';

import { pdfjsLib } from './pdfjs';
import type { PDFDocumentProxy } from './pdfjs';
import { PdfContext } from './PdfContext';

interface PdfProviderProps {
  fileUrl: string;
  children: React.ReactNode;
}

export const PdfProvider: React.FC<PdfProviderProps> = ({ fileUrl, children }) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const task = pdfjsLib.getDocument(fileUrl);
      const doc = await task.promise;
      if (!cancelled) {
        setPdfDoc(doc);
        setNumPages(doc.numPages);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <PdfContext.Provider value={{ pdfDoc, numPages, scale, setScale }}>
      {children}
    </PdfContext.Provider>
  );
};
