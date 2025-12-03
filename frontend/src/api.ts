import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// ---- KB docs in filesystem ----

export interface KbDocItem {
  source: string;
  title: string;
  topic: string;
  read_count: number;
}

export interface KbDocDetail {
  source: string;
  title: string;
  topic: string;
  content: string;
  read_count: number;
}

export async function listKbDocs(): Promise<KbDocItem[]> {
  const resp = await axios.get<KbDocItem[]>(`${API_BASE_URL}/kb/docs`);
  return resp.data;
}

export async function getKbDoc(source: string): Promise<KbDocDetail> {
  const resp = await axios.get<KbDocDetail>(`${API_BASE_URL}/kb/doc`, {
    params: { source },
  });
  return resp.data;
}

// ---- Highlights ----

export interface Highlight {
  id: number;
  source: string;
  page?: number | null;
  topic?: string | null;
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
  topic?: string | null;
  selected_text: string;
  note?: string | null;
}): Promise<Highlight> {
  const resp = await axios.post<Highlight>(`${API_BASE_URL}/highlights`, payload);
  return resp.data;
}

// ---- Online Markdown Docs (飞书风格) ----

export interface MarkdownDocItem {
  id: number;
  title: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

export interface MarkdownDocDetail {
  id: number;
  title: string;
  topic: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface MarkdownDocCreate {
  title?: string;
  topic?: string;
  content?: string;
}

export interface MarkdownDocUpdate {
  title?: string;
  topic?: string;
  content?: string;
}

export async function listDocs(): Promise<MarkdownDocItem[]> {
  const resp = await axios.get<MarkdownDocItem[]>(`${API_BASE_URL}/all/docs`);
  return resp.data;
}

export async function createDoc(payload: MarkdownDocCreate): Promise<MarkdownDocDetail> {
  const resp = await axios.post<MarkdownDocDetail>(`${API_BASE_URL}/docs`, payload);
  return resp.data;
}

export async function getDoc(id: number): Promise<MarkdownDocDetail> {
  const resp = await axios.get<MarkdownDocDetail>(`${API_BASE_URL}/docs/${id}`);
  return resp.data;
}

export async function updateDoc(id: number, payload: MarkdownDocUpdate): Promise<MarkdownDocDetail> {
  const resp = await axios.put<MarkdownDocDetail>(`${API_BASE_URL}/docs/${id}`, payload);
  return resp.data;
}
