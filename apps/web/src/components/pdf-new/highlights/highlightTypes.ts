export type HighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Highlight = {
  id: string;
  pageNumber: number;
  rects: HighlightRect[];
  quoteText: string;
  color?: string;
  comment?: string;
  createdAt: string;
};

export type ExtraHighlight = Highlight;

export type CreateHighlightInput = {
  pageNumber: number;
  rects: HighlightRect[];
  quoteText: string;
  color?: string;
  comment?: string;
};
