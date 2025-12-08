/**
 * 自动生成的 API 客户端包装
 * - 统一配置 BASE 与认证
 * - 暴露生成的服务类集合 `Api`
 */
import axios from "axios";
import { OpenAPI } from "./generated/api/core/OpenAPI";
import * as ApiServices from "./generated/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// 初始化 OpenAPI 配置
OpenAPI.BASE = API_BASE_URL;
OpenAPI.TOKEN = async () => localStorage.getItem("auth_token") || "";

// 全局 401 处理
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 导出所有服务
export const Api = ApiServices;
export { OpenAPI };
