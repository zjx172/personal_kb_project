import React, { useEffect, useState } from 'react';

export const TextLayer = ({
  page,
  viewportSize,
  scale,
}: {
  page: any;
  viewportSize: { width: number; height: number };
  scale: number;
}) => {
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const textContent = await page.getTextContent();
      if (!cancelled) setContent(textContent);
    })();

    return () => {
      cancelled = true;
    };
  }, [page, scale]);

  if (!content) return null;

  const pageHeight = viewportSize.height;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: viewportSize.width,
        height: viewportSize.height,
        pointerEvents: 'auto',
        color: 'transparent',
        userSelect: 'text',
      }}
    >
      {content.items.map((item: any, index: number) => {
        const [a, b, , , e, f] = item.transform;
        const fontSize = Math.sqrt(a * a + b * b) * scale;
        const x = e * scale;
        const y = pageHeight - f * scale;

        return (
          <span
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: y - fontSize,
              fontSize,
              whiteSpace: 'pre',
            }}
          >
            {item.str}
          </span>
        );
      })}
    </div>
  );
};
