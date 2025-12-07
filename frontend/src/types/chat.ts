import { QueryResponse } from "../api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: QueryResponse["citations"];
  sourcesCount?: number;
  timestamp: Date;
}
