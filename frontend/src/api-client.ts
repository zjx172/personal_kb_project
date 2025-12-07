/**
 * 自动生成的 API 客户端
 * 此文件是对生成代码的封装，提供统一的配置和错误处理
 */
import { OpenAPI } from "./generated/api/core/OpenAPI";
import * as ApiServices from "./generated/api/services";
import axios from "axios";

// 配置 API 基础 URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// 初始化 OpenAPI 配置
OpenAPI.BASE = API_BASE_URL;

// 配置请求拦截器（添加认证 token）
OpenAPI.HEADERS = async () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 配置响应拦截器（处理错误）
const originalRequest = OpenAPI.request;
OpenAPI.request = async (options: any) => {
  try {
    return await originalRequest(options);
  } catch (error: any) {
    // 处理 401 未授权
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    throw error;
  }
};

// 导出所有服务
export const Api = ApiServices;

// 导出 OpenAPI 配置（用于自定义）
export { OpenAPI };
