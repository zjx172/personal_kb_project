import React from "react";
import ReactDOM from "react-dom/client";
import "@arco-design/web-react/dist/css/arco.css";
import App from "./App";
import "./index.css";
import {
  initSentry,
  initBlankScreenDetection,
  initJSErrorMonitoring,
} from "./utils/monitoring";

// 初始化监控系统
initSentry();
initBlankScreenDetection();
initJSErrorMonitoring();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
