import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import HomePage from "./pages/HomePage";
import DocPage from "./pages/DocPage";
import GraphPage from "./pages/GraphPage";
import LoginPage from "./pages/LoginPage";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/doc/:id" element={<DocPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
        <Toaster position="top-center" />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
