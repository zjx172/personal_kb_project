import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import DocPage from "./pages/DocPage";
import GraphPage from "./pages/GraphPage";
import LoginPage from "./pages/LoginPage";
import TableDataPage from "./pages/TableDataPage";
import { KnowledgeBaseRedirect } from "./components/KnowledgeBaseRedirect";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<LoginPage />} />
          <Route path="/kb/:knowledgeBaseId" element={<HomePage />} />
          <Route path="/kb/:knowledgeBaseId/doc/:id" element={<DocPage />} />
          <Route path="/kb/:knowledgeBaseId/graph" element={<GraphPage />} />
          <Route
            path="/kb/:knowledgeBaseId/data-source/:dataSourceId"
            element={<TableDataPage />}
          />
          <Route path="/" element={<KnowledgeBaseRedirect />} />
        </Routes>
        <Toaster position="top-center" />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
