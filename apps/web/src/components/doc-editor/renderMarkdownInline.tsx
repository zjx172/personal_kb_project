import React from "react";

// 按 Markdown 语法渲染行内链接：
// - [label](https://example.com)
// - <https://example.com>
// - 裸露的 http/https 链接（GFM 允许的自动链接）
export function renderMarkdownInline(text: string) {
  const nodes: React.ReactNode[] = [];
  const regex =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|<(https?:\/\/[^>\s]+)>|(\bhttps?:\/\/[^\s)]+)/g;
  let lastIndex = 0;
  let key = 0;

  text.replace(
    regex,
    (match, label, urlInParen, urlInAngle, bareUrl, offset) => {
      if (offset > lastIndex) {
        nodes.push(
          <span key={`t-${key++}`}>{text.slice(lastIndex, offset)}</span>
        );
      }
      const href =
        (urlInParen as string) || (urlInAngle as string) || (bareUrl as string);
      const labelText = (label as string) || href;
      nodes.push(
        <a
          key={`l-${key++}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="doc-inline-link"
        >
          {labelText}
        </a>
      );
      lastIndex = (offset as number) + match.length;
      return match;
    }
  );

  if (lastIndex < text.length) {
    nodes.push(<span key={`t-${key++}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes.length ? nodes : text;
}

