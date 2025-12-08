import { Api, OpenAPI } from "./api-client";
import type {
  Body_upload_file_upload_file_post as UploadFileForm,
  Body_upload_pdf_upload_pdf_post as UploadPdfForm,
  ChunkUploadCompleteResponse,
  ConversationCreate,
  ConversationDetail,
  ConversationOut as Conversation,
  ConversationUpdate,
  DataSourceCreate,
  DataSourceDataRequest,
  DataSourceDataResponse,
  DataSourceOut as DataSource,
  DataSourceUpdate,
  HighlightCreate,
  HighlightOut as Highlight,
  KnowledgeBaseCreate,
  KnowledgeBaseOut as KnowledgeBase,
  KnowledgeBaseUpdate,
  MarkdownDocCreate,
  MarkdownDocDetail,
  MarkdownDocItem,
  MarkdownDocUpdate,
  QueryRequest,
  SearchHistoryOut as SearchHistoryItem,
  TaskInfo,
  UploadPdfResponse,
  UserResponse as User,
  WebExtractRequest,
} from "./generated/api";

// re-export types for external consumers
export type { MarkdownDocItem } from "./generated/api";

const API_BASE_URL =
  OpenAPI.BASE || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const getToken = () => localStorage.getItem("auth_token") || undefined;

// ---- Highlights ----

export const listHighlights = (params?: {
  source?: string;
}): Promise<Highlight[]> =>
  Api.HighlightsService.listHighlightsHighlightsGet({
    source: params?.source,
    token: getToken(),
  });

export const createHighlight = (payload: HighlightCreate): Promise<Highlight> =>
  Api.HighlightsService.createHighlightHighlightsPost({
    requestBody: payload,
    token: getToken(),
  });

// ---- Online Markdown Docs ----

export const listDocs = (
  knowledge_base_id?: string
): Promise<MarkdownDocItem[]> =>
  Api.DocsService.listMarkdownDocsDocsAllGet({
    knowledgeBaseId: knowledge_base_id,
    token: getToken(),
  });

export const createDoc = (
  payload: MarkdownDocCreate
): Promise<MarkdownDocDetail> =>
  Api.DocsService.createMarkdownDocDocsPost({
    requestBody: payload,
    token: getToken(),
  });

export const getDoc = (id: string): Promise<MarkdownDocDetail> =>
  Api.DocsService.getMarkdownDocDocsDocIdGet({
    docId: id,
    token: getToken(),
  });

export const updateDoc = (
  id: string,
  payload: MarkdownDocUpdate
): Promise<MarkdownDocDetail> =>
  Api.DocsService.updateMarkdownDocDocsDocIdPut({
    docId: id,
    requestBody: payload,
    token: getToken(),
  });

export const deleteDoc = (id: string): Promise<void> =>
  Api.DocsService.deleteMarkdownDocDocsDocIdDelete({
    docId: id,
    token: getToken(),
  }).then(() => {});

export const extractWebContent = (
  payload: WebExtractRequest
): Promise<MarkdownDocDetail> =>
  Api.DocsService.extractWebContentDocsExtractWebPost({
    requestBody: payload,
    token: getToken(),
  });

// ---- Uploads ----

const shouldUseChunk = (file: File) => file.size > 10 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

export const uploadPdf = (
  file: File,
  title?: string,
  knowledge_base_id?: string
): Promise<UploadPdfResponse> => {
  if (shouldUseChunk(file)) {
    return uploadPdfChunked(file, title, knowledge_base_id, DEFAULT_CHUNK_SIZE);
  }
  const formData: UploadPdfForm = { file };
  return Api.PdfService.uploadPdfUploadPdfPost({
    formData,
    title,
    knowledgeBaseId: knowledge_base_id,
    token: getToken(),
  });
};

export const uploadFile = (
  file: File,
  title?: string,
  knowledge_base_id?: string
): Promise<UploadPdfResponse> => {
  if (shouldUseChunk(file)) {
    return uploadFileChunked(
      file,
      title,
      knowledge_base_id,
      DEFAULT_CHUNK_SIZE
    );
  }
  const formData: UploadFileForm = { file, title, knowledge_base_id };
  return Api.FileUploadService.uploadFileUploadFilePost({
    formData,
    token: getToken(),
  });
};

export const uploadPdfChunked = async (
  file: File,
  title?: string,
  knowledge_base_id?: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<UploadPdfResponse> => {
  const { upload_id, total_chunks } =
    await Api.ChunkUploadService.initChunkUploadChunkUploadInitPost({
      requestBody: {
        filename: file.name,
        total_size: file.size,
        chunk_size: chunkSize,
        title,
        knowledge_base_id,
      },
      token: getToken(),
    });

  for (let chunkIndex = 0; chunkIndex < total_chunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    const formData = {
      upload_id,
      chunk_index: chunkIndex,
      chunk,
    };

    await Api.ChunkUploadService.uploadChunkChunkUploadUploadPost({
      formData,
      token: getToken(),
    });
  }

  return Api.ChunkUploadService.completeChunkUploadChunkUploadCompletePost({
    requestBody: { upload_id },
    token: getToken(),
  }).then((res: ChunkUploadCompleteResponse) => ({
    task_id: res.task_id,
    message: res.message,
  }));
};

export const uploadFileChunked = (
  file: File,
  title?: string,
  knowledge_base_id?: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<UploadPdfResponse> =>
  uploadPdfChunked(file, title, knowledge_base_id, chunkSize);

export const getTaskStatus = (taskId: string): Promise<TaskInfo> =>
  Api.TasksService.getTaskStatusTaskTaskIdGet({ taskId });

export const getPdfUrl = (docId: string): string => {
  const token = getToken();
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_BASE_URL}/docs/${docId}/pdf${qs}`;
};

// ---- Knowledge Base Query ----

export interface Citation {
  index: number;
  source: string;
  title?: string;
  snippet: string;
  doc_id?: string;
  page?: number;
  chunk_index?: number;
  chunk_position?: string;
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

export const queryKnowledgeBaseStream = async (
  question: string,
  onChunk: (chunk: StreamChunk) => void,
  options?: QueryRequest
): Promise<QueryResponse> => {
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
    body: JSON.stringify({ ...options, question }),
  });

  if (!response.ok) {
    if (response.status === 401) {
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
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6)) as StreamChunk;
        if (data.type === "chunk" && data.chunk) {
          finalAnswer += data.chunk;
          onChunk({ type: "chunk", chunk: data.chunk });
        } else if (data.type === "citations" && data.citations) {
          finalCitations = data.citations;
          onChunk({ type: "citations", citations: data.citations });
        } else if (data.type === "final") {
          if (data.answer) finalAnswer = data.answer;
          if (data.citations) finalCitations = data.citations;
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

  return { answer: finalAnswer, citations: finalCitations };
};

export const queryKnowledgeBase = (
  question: string,
  options?: QueryRequest
): Promise<QueryResponse> =>
  Api.SearchService.queryKbQueryPost({
    requestBody: { ...options, question },
    token: getToken(),
  });

// ---- Docs insights ----

export const generateDocSummary = (
  docId: string
): Promise<{ summary: string }> =>
  Api.DocsService.generateDocSummaryDocsDocIdGenerateSummaryPost({
    docId,
    token: getToken(),
  });

export const recommendDocTags = (docId: string): Promise<{ tags: string[] }> =>
  Api.DocsService.recommendDocTagsDocsDocIdRecommendTagsPost({
    docId,
    token: getToken(),
  });

export const getRelatedDocs = (
  docId: string,
  topK: number = 5
): Promise<{ related_docs: any[] }> =>
  Api.DocsService.getRelatedDocsDocsDocIdRelatedGet({
    docId,
    topK,
    token: getToken(),
  });

export const getDocsGraph = (): Promise<{
  nodes: any[];
  edges: any[];
}> => Api.DocsService.getDocsGraphDocsGraphGet({ token: getToken() });

// ---- Search History & Conversations ----

export const createConversation = (
  knowledge_base_id: string,
  title?: string
): Promise<Conversation> =>
  Api.ConversationsService.createConversationConversationsPost({
    requestBody: {
      knowledge_base_id,
      title,
    } as ConversationCreate,
    token: getToken(),
  });

export const getConversation = (
  conversationId: string
): Promise<ConversationDetail> =>
  Api.ConversationsService.getConversationConversationsConversationIdGet({
    conversationId,
    token: getToken(),
  });

export const updateConversation = (
  conversationId: string,
  title: string
): Promise<Conversation> =>
  Api.ConversationsService.updateConversationConversationsConversationIdPut({
    conversationId,
    requestBody: { title } as ConversationUpdate,
    token: getToken(),
  });

export const deleteConversation = (conversationId: string): Promise<void> =>
  Api.ConversationsService.deleteConversationConversationsConversationIdDelete({
    conversationId,
    token: getToken(),
  }).then(() => {});

export const listConversations = (
  knowledge_base_id?: string
): Promise<Conversation[]> =>
  Api.ConversationsService.listConversationsConversationsGet({
    knowledgeBaseId: knowledge_base_id,
    token: getToken(),
  });

export const listSearchHistory = (
  conversationId?: string,
  limit: number = 20
): Promise<SearchHistoryItem[]> =>
  Api.SearchHistoryService.listSearchHistorySearchHistoryGet({
    conversationId,
    limit,
    token: getToken(),
  });

export const deleteSearchHistory = (historyId: number): Promise<void> =>
  Api.SearchHistoryService.deleteSearchHistorySearchHistoryHistoryIdDelete({
    historyId,
    token: getToken(),
  }).then(() => {});

export const clearSearchHistory = (): Promise<void> =>
  Api.SearchHistoryService.clearSearchHistorySearchHistoryDelete({
    token: getToken(),
  }).then(() => {});

// ---- Auth ----

export interface AuthResponse {
  authorization_url: string;
  state: string;
}

export const getGoogleAuthUrl = (): Promise<AuthResponse> =>
  Api.AuthService.googleLoginAuthGoogleGet();

export const getCurrentUser = (): Promise<User> =>
  Api.AuthService.getCurrentUserInfoAuthMeGet({ token: getToken() });

export const logout = (): Promise<void> =>
  Api.AuthService.logoutAuthLogoutPost().then(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  });

// ---- Knowledge Bases ----

export const listKnowledgeBases = (): Promise<KnowledgeBase[]> =>
  Api.KnowledgeBasesService.listKnowledgeBasesKnowledgeBasesGet({
    token: getToken(),
  });

export const createKnowledgeBase = (
  payload: KnowledgeBaseCreate
): Promise<KnowledgeBase> =>
  Api.KnowledgeBasesService.createKnowledgeBaseKnowledgeBasesPost({
    requestBody: payload,
    token: getToken(),
  });

export const getKnowledgeBase = (id: string): Promise<KnowledgeBase> =>
  Api.KnowledgeBasesService.getKnowledgeBaseKnowledgeBasesKbIdGet({
    kbId: id,
    token: getToken(),
  });

export const updateKnowledgeBase = (
  id: string,
  payload: KnowledgeBaseUpdate
): Promise<KnowledgeBase> =>
  Api.KnowledgeBasesService.updateKnowledgeBaseKnowledgeBasesKbIdPut({
    kbId: id,
    requestBody: payload,
    token: getToken(),
  });

export const deleteKnowledgeBase = (id: string): Promise<void> =>
  Api.KnowledgeBasesService.deleteKnowledgeBaseKnowledgeBasesKbIdDelete({
    kbId: id,
    token: getToken(),
  }).then(() => {});

// ---- Data Sources ----

export const listDataSources = (
  knowledgeBaseId: string
): Promise<DataSource[]> =>
  Api.DataSourcesService.listDataSourcesDataSourcesGet({
    knowledgeBaseId,
    token: getToken(),
  });

export const createDataSource = (
  payload: DataSourceCreate
): Promise<DataSource> =>
  Api.DataSourcesService.createDataSourceDataSourcesPost({
    requestBody: payload,
    token: getToken(),
  });

export const updateDataSource = (
  id: string,
  payload: DataSourceUpdate
): Promise<DataSource> =>
  Api.DataSourcesService.updateDataSourceDataSourcesIdPut({
    id,
    requestBody: payload,
    token: getToken(),
  });

export const getDataSource = (id: string): Promise<DataSource> =>
  Api.DataSourcesService.getDataSourceDataSourcesIdGet({
    id,
    token: getToken(),
  });

export const deleteDataSource = (id: string): Promise<void> =>
  Api.DataSourcesService.deleteDataSourceDataSourcesIdDelete({
    id,
    token: getToken(),
  }).then(() => {});

export const getDataSourceData = (
  id: string,
  request: DataSourceDataRequest = {}
): Promise<DataSourceDataResponse> =>
  Api.DataSourcesService.getDataSourceDataDataSourcesIdDataPost({
    id,
    requestBody: request,
    token: getToken(),
  });
