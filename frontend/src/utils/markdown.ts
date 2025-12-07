/**
 * 原生 Markdown 转 HTML 工具函数
 * 不依赖任何外部库，纯 JavaScript 实现
 */

/**
 * 生成标题的 slug ID
 */
const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const markdownToHtml = (
  markdown: string,
  options?: { generateHeadingIds?: boolean }
): string => {
  const generateHeadingIds = options?.generateHeadingIds ?? false;
  if (!markdown) return "";

  // 转义 HTML 特殊字符
  const escapeHtml = (text: string) => {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  // 先处理代码块（避免代码块内的内容被其他规则处理）
  const codeBlocks: string[] = [];
  let codeBlockIndex = 0;
  markdown = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const id = `__CODE_BLOCK_${codeBlockIndex++}__`;
    const escapedCode = escapeHtml(code.trim());
    codeBlocks.push(
      `<pre class="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto my-2"><code${lang ? ` class="language-${lang}"` : ""}>${escapedCode}</code></pre>`
    );
    return id;
  });

  // 处理行内代码
  const inlineCodes: string[] = [];
  let inlineCodeIndex = 0;
  markdown = markdown.replace(/`([^`\n]+)`/g, (match, code) => {
    const id = `__INLINE_CODE_${inlineCodeIndex++}__`;
    const escapedCode = escapeHtml(code);
    inlineCodes.push(
      `<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm">${escapedCode}</code>`
    );
    return id;
  });

  // 按行处理
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

    const processInline = (text: string): string => {
      // 高亮（使用 ==text== 语法，需要在粗体之前处理，避免冲突）
      text = text.replace(/==(.+?)==/g, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
      
      // 粗体
      text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

      // 斜体（避免与粗体冲突）
      text = text.replace(
        /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,
        "<em>$1</em>"
      );
      text = text.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

      // 删除线
      text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");

    // 链接（支持 citation: 格式的特殊链接）
    text = text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, linkText, href) => {
        if (href.startsWith("citation:")) {
          // 引用链接，保持原样，让调用者处理
          return `<a href="${href}" class="citation-link text-blue-600 hover:underline cursor-pointer" data-citation="${href.replace("citation:", "")}">${linkText}</a>`;
        }
        return `<a href="${href}" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      }
    );

    return text;
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const tag = listType === "ol" ? "ol" : "ul";
      const className =
        listType === "ol"
          ? "list-decimal list-inside my-2 space-y-1"
          : "list-disc list-inside my-2 space-y-1";
      result.push(
        `<${tag} class="${className}">${listItems.join("")}</${tag}>`
      );
      listItems = [];
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (!trimmed) {
      flushList();
      continue;
    }

    // 代码块占位符
    if (trimmed.startsWith("__CODE_BLOCK_")) {
      const index = parseInt(
        trimmed.replace("__CODE_BLOCK_", "").replace("__", "")
      );
      result.push(codeBlocks[index]);
      continue;
    }

    // 分割线
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      result.push('<hr class="my-4">');
      continue;
    }

      // 标题
      if (trimmed.startsWith("### ")) {
        flushList();
        const text = processInline(escapeHtml(trimmed.substring(4)));
        const idAttr = generateHeadingIds
          ? ` id="${generateSlug(text.replace(/<[^>]*>/g, ""))}"`
          : "";
        result.push(
          `<h3${idAttr} class="text-xl font-semibold my-3">${text}</h3>`
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushList();
        const text = processInline(escapeHtml(trimmed.substring(3)));
        const idAttr = generateHeadingIds
          ? ` id="${generateSlug(text.replace(/<[^>]*>/g, ""))}"`
          : "";
        result.push(
          `<h2${idAttr} class="text-2xl font-semibold my-4">${text}</h2>`
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushList();
        const text = processInline(escapeHtml(trimmed.substring(2)));
        const idAttr = generateHeadingIds
          ? ` id="${generateSlug(text.replace(/<[^>]*>/g, ""))}"`
          : "";
        result.push(
          `<h1${idAttr} class="text-3xl font-semibold my-5">${text}</h1>`
        );
        continue;
      }

    // 引用
    if (trimmed.startsWith("> ")) {
      flushList();
      const text = processInline(escapeHtml(trimmed.substring(2)));
      result.push(
        `<blockquote class="border-l-4 border-gray-300 pl-4 my-2 text-gray-600 italic">${text}</blockquote>`
      );
      continue;
    }

    // 有序列表
    const olMatch = trimmed.match(/^(\d+)\. (.+)$/);
    if (olMatch) {
      const text = processInline(escapeHtml(olMatch[2]));
      if (!inList || listType !== "ol") {
        flushList();
        inList = true;
        listType = "ol";
      }
      listItems.push(`<li>${text}</li>`);
      continue;
    }

    // 无序列表
    const ulMatch = trimmed.match(/^[-*] (.+)$/);
    if (ulMatch) {
      const text = processInline(escapeHtml(ulMatch[1]));
      if (!inList || listType !== "ul") {
        flushList();
        inList = true;
        listType = "ul";
      }
      listItems.push(`<li>${text}</li>`);
      continue;
    }

    // 普通段落
    flushList();
    let processedLine = escapeHtml(trimmed);
    // 恢复行内代码占位符
    processedLine = processedLine.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
      return inlineCodes[parseInt(index)] || match;
    });
    processedLine = processInline(processedLine);
    result.push(`<p class="my-2">${processedLine}</p>`);
  }

  flushList();

  let html = result.join("\n");

  // 恢复代码块占位符
  html = html.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
    return codeBlocks[parseInt(index)] || match;
  });

  return html;
};

