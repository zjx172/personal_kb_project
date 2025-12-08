import React from "react";

import { usePdfContext } from "../pdf/PdfContext";
import { PageList } from "./PageList";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

export const PdfViewer = () => {
  const { numPages } = usePdfContext();

  if (!numPages) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: "auto", background: "#f3f3f3" }}>
          <PageList numPages={numPages} />
        </div>
        <Sidebar />
      </div>
    </div>
  );
};
