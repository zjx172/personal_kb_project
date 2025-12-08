import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  createHighlight,
  deleteHighlight as deleteHighlightApi,
  listHighlights,
} from "../../../api";
import type { HighlightCreate, HighlightOut } from "../../../generated/api";
import { selectionToPageRects } from "../utils/coords";
import type { Highlight } from "./highlightTypes";

interface HighlightsContextValue {
  highlights: Highlight[];
  getHighlightsForPage: (page: number) => Highlight[];
  createHighlightFromSelection: (args: {
    pageNumber: number;
    pageContainer: HTMLElement;
  }) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  scrollToHighlight: (id: string) => void;
  flashHighlightId: string | null;
  loading: boolean;
}

interface HighlightsProviderProps {
  source: string;
  children: React.ReactNode;
  defaultColor?: string;
}

const HighlightsContext = createContext<HighlightsContextValue | null>(null);

const mapApiHighlight = (highlight: HighlightOut): Highlight => {
  const rects =
    Array.isArray(highlight.rects) && highlight.rects.length
      ? highlight.rects
      : [];

  return {
    id: String(highlight.id),
    pageNumber: highlight.page ?? 1,
    rects: rects.map((rect) => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })),
    quoteText: highlight.selected_text,
    color: highlight.color || undefined,
    comment: highlight.note || undefined,
    createdAt: highlight.created_at,
  };
};

export const useHighlightsContext = () => {
  const ctx = useContext(HighlightsContext);
  if (!ctx) throw new Error("useHighlightsContext");
  return ctx;
};

export const HighlightsProvider: React.FC<HighlightsProviderProps> = ({
  children,
  source,
  defaultColor = "rgba(255,230,140,0.6)",
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [flashHighlightId, setFlashHighlightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchHighlights = async () => {
      if (!source) return;
      setLoading(true);
      try {
        const data = await listHighlights({ source });
        if (!cancelled) {
          setHighlights(data.map(mapApiHighlight));
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("加载高亮失败", err);
          toast.error(err?.message || "加载高亮失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHighlights();
    return () => {
      cancelled = true;
    };
  }, [source]);

  const getHighlightsForPage = (pageNumber: number) =>
    highlights.filter((highlight) => highlight.pageNumber === pageNumber);

  const createHighlightFromSelection = async ({
    pageNumber,
    pageContainer,
  }: {
    pageNumber: number;
    pageContainer: HTMLElement;
  }) => {
    if (savingRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const quote = selection.toString().trim();
    if (!quote) return;

    const rects = selectionToPageRects(selection, pageContainer);
    if (!rects.length) return;

    const tempId = crypto.randomUUID();
    const optimistic: Highlight = {
      id: tempId,
      pageNumber,
      rects,
      quoteText: quote,
      createdAt: new Date().toISOString(),
      color: defaultColor,
    };

    setHighlights((prev) => [...prev, optimistic]);
    savingRef.current = true;

    try {
      const payload: HighlightCreate = {
        source,
        page: pageNumber,
        selected_text: quote,
        rects,
        color: defaultColor,
        note: null,
      };

      const created = await createHighlight(payload);
      setHighlights((prev) =>
        prev
          .filter((h) => h.id !== tempId)
          .concat(mapApiHighlight(created))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
      );
      toast.success("高亮已保存");
    } catch (err: any) {
      console.error("保存高亮失败", err);
      setHighlights((prev) => prev.filter((h) => h.id !== tempId));
      toast.error(err?.message || "保存高亮失败");
    } finally {
      savingRef.current = false;
      selection.removeAllRanges();
    }
  };

  const deleteHighlight = async (id: string) => {
    const numericId = Number(id);
    const prev = highlights;
    setHighlights((h) => h.filter((item) => item.id !== id));
    try {
      if (!Number.isNaN(numericId)) {
        await deleteHighlightApi(numericId);
      }
      toast.success("高亮已删除");
    } catch (err: any) {
      console.error("删除高亮失败", err);
      setHighlights(prev);
      toast.error(err?.message || "删除高亮失败");
    }
  };

  const flash = (id: string) => {
    setFlashHighlightId(id);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashHighlightId(null), 800);
  };

  const scrollToHighlight = (id: string) => {
    const el = document.getElementById(`highlight-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(id);
  };

  return (
    <HighlightsContext.Provider
      value={{
        highlights,
        getHighlightsForPage,
        createHighlightFromSelection,
        deleteHighlight,
        scrollToHighlight,
        flashHighlightId,
        loading,
      }}
    >
      {children}
    </HighlightsContext.Provider>
  );
};
