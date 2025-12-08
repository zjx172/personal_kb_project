import React from 'react';

import { PdfPage } from './PdfPage';

export const PageList = ({ numPages }: { numPages: number }) => {
  return (
    <div style={{ padding: '16px 0' }}>
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
        <PdfPage key={pageNumber} pageNumber={pageNumber} />
      ))}
    </div>
  );
};
