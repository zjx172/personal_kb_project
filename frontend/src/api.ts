import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// 从 localStorage 获取 token
const getToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

// 设置 axios 默认请求头
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 处理 401 未授权错误
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 清除 token 并重定向到登录页
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// // ---- KB docs in filesystem ----

// export interface KbDocItem {
//   source: string;
//   title: string;
//   read_count: number;
// }

// export interface KbDocDetail {
//   source: string;
//   title: string;
//   content: string;
//   read_count: number;
// }

// export async function listKbDocs(): Promise<KbDocItem[]> {
//   const resp = await axios.get<KbDocItem[]>(`${API_BASE_URL}/kb/docs`);
//   return resp.data;
// }

// export async function getKbDoc(source: string): Promise<KbDocDetail> {
//   const resp = await axios.get<KbDocDetail>(`${API_BASE_URL}/kb/doc`, {
//     params: { source },
//   });
//   return resp.data;
// }

// ---- Highlights ----

export interface Highlight {
  id: number;
  source: string;
  page?: number | null;
  selected_text: string;
  note?: string | null;
  created_at: string;
}

export async function listHighlights(params?: {
  source?: string;
}): Promise<Highlight[]> {
  const resp = await axios.get<Highlight[]>(`${API_BASE_URL}/highlights`, {
    params,
  });
  return resp.data;
}

export async function createHighlight(payload: {
  source: string;
  page?: number | null;
  selected_text: string;
  note?: string | null;
}): Promise<Highlight> {
  const resp = await axios.post<Highlight>(
    `${API_BASE_URL}/highlights`,
    payload
  );
  return resp.data;
}

// ---- Online Markdown Docs (飞书风格) ----

export interface MarkdownDocItem {
  id: string;
  title: string;
  doc_type?: string;
  summary?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
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

export interface MarkdownDocCreate {
  title?: string;
  content?: string;
  doc_type?: string;
}

export interface MarkdownDocUpdate {
  title?: string;
  content?: string;
  doc_type?: string;
}

export async function listDocs(): Promise<MarkdownDocItem[]> {
  const resp = await axios.get<MarkdownDocItem[]>(`${API_BASE_URL}/all/docs`);
  return resp.data;
}

export async function createDoc(
  payload: MarkdownDocCreate
): Promise<MarkdownDocDetail> {
  const resp = await axios.post<MarkdownDocDetail>(
    `${API_BASE_URL}/docs`,
    payload
  );
  return resp.data;
}

export async function getDoc(id: string): Promise<MarkdownDocDetail> {
  const resp = await axios.get<MarkdownDocDetail>(`${API_BASE_URL}/docs/${id}`);
  return resp.data;
}

export async function updateDoc(
  id: string,
  payload: MarkdownDocUpdate
): Promise<MarkdownDocDetail> {
  const resp = await axios.put<MarkdownDocDetail>(
    `${API_BASE_URL}/docs/${id}`,
    payload
  );
  return resp.data;
}

export async function deleteDoc(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/docs/${id}`);
}

// ---- Web Content Extraction ----

export interface WebExtractRequest {
  url: string;
  title?: string;
}

export async function extractWebContent(
  payload: WebExtractRequest
): Promise<MarkdownDocDetail> {
  const resp = await axios.post<MarkdownDocDetail>(
    `${API_BASE_URL}/extract-web`,
    payload
  );
  return resp.data;
}

// ---- Knowledge Base Query ----

export interface Citation {
  index: number;
  source: string;
  title?: string;
  snippet: string;
  doc_id?: string;
  page?: number;
  chunk_index?: number; // Chunk 索引
  chunk_position?: string; // Chunk 位置描述
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
}

export interface StreamChunk {
  type: "chunk" | "citations" | "final";
  chunk?: string;
  citations?: Citation[];
  answer?: string;
}

export async function queryKnowledgeBaseStream(
  question: string,
  onChunk: (chunk: StreamChunk) => void,
  options?: {
    doc_type?: string;
    tags?: string[];
    start_date?: string;
    end_date?: string;
    use_keyword_search?: boolean;
    k?: number;
    rerank_k?: number;
  }
): Promise<QueryResponse> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question,
      ...options,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      // 清除 token 并重定向到登录页
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalAnswer = "";
  let finalCitations: Citation[] = [];

  if (!reader) {
    throw new Error("No response body");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || ""; // 保留最后一个不完整的行

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamChunk;

          if (data.type === "chunk" && data.chunk) {
            finalAnswer += data.chunk;
            onChunk({ type: "chunk", chunk: data.chunk });
          } else if (data.type === "citations" && data.citations) {
            finalCitations = data.citations;
            onChunk({ type: "citations", citations: data.citations });
          } else if (data.type === "final") {
            if (data.answer) {
              finalAnswer = data.answer;
            }
            if (data.citations) {
              finalCitations = data.citations;
            }
            onChunk({
              type: "final",
              answer: finalAnswer,
              citations: finalCitations,
            });
          }
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      }
    }
  }

  return {
    answer: finalAnswer,
    citations: finalCitations,
  };
}

// ---- 智能功能 API ----

export async function generateDocSummary(
  docId: string
): Promise<{ summary: string }> {
  const resp = await axios.post<{ summary: string }>(
    `${API_BASE_URL}/docs/${docId}/generate-summary`
  );
  return resp.data;
}

export async function recommendDocTags(
  docId: string
): Promise<{ tags: string[] }> {
  const resp = await axios.post<{ tags: string[] }>(
    `${API_BASE_URL}/docs/${docId}/recommend-tags`
  );
  return resp.data;
}

export interface RelatedDoc {
  id: string;
  title: string;
  summary?: string;
}

export async function getRelatedDocs(
  docId: string,
  topK: number = 5
): Promise<{ related_docs: RelatedDoc[] }> {
  const resp = await axios.get<{ related_docs: RelatedDoc[] }>(
    `${API_BASE_URL}/docs/${docId}/related`,
    { params: { top_k: topK } }
  );
  return resp.data;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  tags: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  tags: string[];
}

export interface DocsGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export async function getDocsGraph(): Promise<DocsGraph> {
  const resp = await axios.get<DocsGraph>(`${API_BASE_URL}/docs/graph`);
  return resp.data;
}

// 保留旧接口以兼容，但标记为废弃
export async function queryKnowledgeBase(
  question: string
): Promise<QueryResponse> {
  const resp = await axios.post<QueryResponse>(`${API_BASE_URL}/query`, {
    question,
  });
  return resp.data;
}

// ---- Search History ----

export interface SearchHistoryItem {
  id: number;
  query: string;
  answer?: string;
  citations?: Citation[];
  sources_count?: number;
  created_at: string;
}

export async function listSearchHistory(
  limit: number = 20
): Promise<SearchHistoryItem[]> {
  const resp = await axios.get<SearchHistoryItem[]>(
    `${API_BASE_URL}/search-history`,
    { params: { limit } }
  );
  return resp.data;
}

export async function deleteSearchHistory(historyId: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/search-history/${historyId}`);
}

export async function clearSearchHistory(): Promise<void> {
  await axios.delete(`${API_BASE_URL}/search-history`);
}

// ---- Authentication ----

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

export async function getGoogleAuthUrl(): Promise<AuthResponse> {
  const resp = await axios.get<AuthResponse>(`${API_BASE_URL}/auth/google`);
  return resp.data;
}

export async function getCurrentUser(): Promise<User> {
  const resp = await axios.get<User>(`${API_BASE_URL}/auth/me`);
  return resp.data;
}

export async function logout(): Promise<void> {
  await axios.post(`${API_BASE_URL}/auth/logout`);
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user");
}
