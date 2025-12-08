import React from "react";

import { HighlightsProvider } from "./highlights/HighlightsContext";
import { PdfProvider } from "./pdf/PdfProvider";
import { PdfViewer } from "./viewer/PdfViewer";

const PDF_URL = "/9edd7928-a8a4-47f6-a694-cf5f5bb11ee4.pdf";
const HIGHLIGHT_SOURCE = "demo-pdf";

export const App: React.FC = () => {
  return (
    <PdfProvider fileUrl={PDF_URL}>
      <HighlightsProvider source={HIGHLIGHT_SOURCE}>
        <PdfViewer />
      </HighlightsProvider>
    </PdfProvider>
  );
};
