const API_BASE_URL = "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthResponse {
  authorization_url: string;
  state: string;
}

// 获取存储的 token
export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get("auth_token");
  return result.auth_token || null;
}

// 设置 token
export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ auth_token: token });
}

// 清除 token
export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove("auth_token");
}

// API 请求封装
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token 无效，清除并跳转登录
    await clearToken();
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(error.detail || "请求失败");
  }

  return response.json();
}

// 获取 Google 登录 URL
export async function getGoogleAuthUrl(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/google");
}

// 获取当前用户信息
export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

// 提取网页内容
export interface WebExtractRequest {
  url: string;
  title?: string;
}

export interface MarkdownDocDetail {
  id: string;
  title: string;
  content: string;
  doc_type?: string;
  summary?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export async function extractWebContent(
  payload: WebExtractRequest
): Promise<MarkdownDocDetail> {
  return apiRequest<MarkdownDocDetail>("/extract-web", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
