import React from "react";

import "./pdf-new/index.css";
import { HighlightsProvider } from "./pdf-new/highlights/HighlightsContext";
import { PdfProvider } from "./pdf-new/pdf/PdfProvider";
import { PdfViewer as InternalPdfViewer } from "./pdf-new/viewer/PdfViewer";

interface PdfViewerProps {
  url: string;
  docId: string;
  title?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  docId,
  title: _title,
}) => {
  const source = `markdown_doc:${docId}`;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <PdfProvider fileUrl={url}>
        <HighlightsProvider source={source}>
          <InternalPdfViewer />
        </HighlightsProvider>
      </PdfProvider>
    </div>
  );
};

export default PdfViewer;
