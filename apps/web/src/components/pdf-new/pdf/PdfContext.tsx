import React, { createContext, useContext } from 'react';

import type { PDFDocumentProxy } from './pdfjs';

export interface PdfState {
  pdfDoc: PDFDocumentProxy | null;
  numPages: number;
  scale: number;
  setScale: (s: number) => void;
}

export const PdfContext = createContext<PdfState | null>(null);

export const usePdfContext = () => {
  const ctx = useContext(PdfContext);
  if (!ctx) throw new Error('usePdfContext must be used within PdfProvider');
  return ctx;
};
