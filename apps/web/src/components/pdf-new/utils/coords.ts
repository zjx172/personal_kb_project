export function clientRectToPageRect(rect: DOMRect, pageRect: DOMRect) {
  const pageWidth = pageRect.width || 1;
  const pageHeight = pageRect.height || 1;

  return {
    x: (rect.left - pageRect.left) / pageWidth,
    y: (rect.top - pageRect.top) / pageHeight,
    width: rect.width / pageWidth,
    height: rect.height / pageHeight,
  };
}

export function selectionToPageRects(
  selection: Selection,
  pageContainer: HTMLElement
) {
  if (selection.isCollapsed) return [];

  const range = selection.getRangeAt(0);
  const rects = [...range.getClientRects()];
  const pageRect = pageContainer.getBoundingClientRect();

  return rects
    .filter(
      (rect) =>
        rect.right > pageRect.left &&
        rect.left < pageRect.right &&
        rect.bottom > pageRect.top &&
        rect.top < pageRect.bottom
    )
    .map((rect) => clientRectToPageRect(rect, pageRect))
    .filter((rect) => rect.width > 0.001 && rect.height > 0.001);
}
