import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

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

export interface Highlight {
  id: number;
  source: string;
  page?: number | null;
  topic?: string | null;
  selected_text: string;
  note?: string | null;
  created_at: string;
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
