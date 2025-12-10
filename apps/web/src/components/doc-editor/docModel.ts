export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "quote"
  | "bulleted"
  | "numbered"
  | "ref"
  | "divider";

export interface DocBlock {
  id: string;
  type: BlockType;
  text: string;
  refId?: string; // 对 ref block 的引用 id
  refTitle?: string;
}

export interface OutlineItem {
  id: string;
  blockId: string;
  type: "heading" | "ref";
  level: number; // heading 等级 or 0 for ref
  text: string;
}

export function createBlock(type: BlockType, text = ""): DocBlock {
  return {
    id: generateId(),
    type,
    text,
  };
}

export function generateId(): string {
  return "b_" + Math.random().toString(36).slice(2, 10);
}

export function buildOutline(blocks: DocBlock[]): OutlineItem[] {
  const outline: OutlineItem[] = [];
  blocks.forEach((b) => {
    if (
      b.type === "heading1" ||
      b.type === "heading2" ||
      b.type === "heading3"
    ) {
      const level = b.type === "heading1" ? 1 : b.type === "heading2" ? 2 : 3;
      outline.push({
        id: b.id,
        blockId: b.id,
        type: "heading",
        level,
        text: b.text || "(无标题)",
      });
    } else if (b.type === "ref") {
      outline.push({
        id: b.id,
        blockId: b.id,
        type: "ref",
        level: 0,
        text: b.refTitle || b.text.slice(0, 24) || "(引用块)",
      });
    }
  });
  return outline;
}

/**
 * 非严格 markdown，仅仅是 "块级" 的导出，把 block model 映射到普通 markdown：
 * - heading1 => # xxx
 * - heading2 => ## xxx
 * - bulleted => - xxx
 * - numbered => 1. xxx
 * - quote    => > xxx
 * - ref      => :::ref id=... title="..." / text
 */
export function blocksToMarkdown(blocks: DocBlock[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading1":
        lines.push("# " + b.text);
        break;
      case "heading2":
        lines.push("## " + b.text);
        break;
      case "heading3":
        lines.push("### " + b.text);
        break;
      case "bulleted":
        lines.push("- " + b.text);
        break;
      case "numbered":
        lines.push("1. " + b.text);
        break;
      case "quote":
        lines.push("> " + b.text);
        break;
      case "divider":
        lines.push("---");
        break;
      case "ref": {
        const id = b.refId || b.id;
        const title = b.refTitle || b.text.slice(0, 20);
        lines.push(`:::ref id=${id} title="${title}"`);
        if (b.text) {
          lines.push(b.text);
        }
        lines.push(":::");
        break;
      }
      default:
        lines.push(b.text);
    }
  }
  return lines.join("\n");
}

function isDocBlockArray(value: unknown): value is DocBlock[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as DocBlock).id === "string" &&
        typeof (item as DocBlock).type === "string" &&
        typeof (item as DocBlock).text === "string"
    )
  );
}

/**
 * 尝试从字符串恢复 DocBlock 列表。
 * - 优先支持 JSON 数组（便于后续直接存 blocks）
 * - 其次是简化版 markdown 行解析
 */
export function markdownToBlocks(content: string): DocBlock[] {
  if (!content || !content.trim()) {
    return [createBlock("paragraph", "")];
  }

  // 支持直接存储 JSON（便于未来无损恢复）
  try {
    const parsed = JSON.parse(content);
    if (isDocBlockArray(parsed)) {
      const normalized = parsed.map((b) => ({
        ...b,
        id: b.id || generateId(),
        type: b.type as BlockType,
        text: b.text ?? "",
      }));
      return normalized.length > 0
        ? normalized
        : [createBlock("paragraph", "")];
    }
  } catch {
    // ignore
  }

  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: DocBlock[] = [];

  const parseRefMeta = (line: string) => {
    const match = line.match(/^:::ref\s+id=([^\s]+)(?:\s+title="([^"]*)")?/);
    if (!match) return { refId: undefined, refTitle: undefined };
    return { refId: match[1], refTitle: match[2] };
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 分割线（支持 --- *** ___）
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      blocks.push({ id: generateId(), type: "divider", text: "" });
      i += 1;
      continue;
    }

    // 引用块：:::ref id=xxx title="xxx" ... :::
    if (line.startsWith(":::ref")) {
      const { refId, refTitle } = parseRefMeta(line);
      i += 1;
      const refLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== ":::") {
        refLines.push(lines[i]);
        i += 1;
      }
      const text = refLines.join("\n").trim();
      blocks.push({
        id: generateId(),
        type: "ref",
        refId,
        refTitle,
        text,
      });
      i += 1; // skip closing :::
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push({
        id: generateId(),
        type: "heading1",
        text: line.slice(2).trim(),
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        id: generateId(),
        type: "heading2",
        text: line.slice(3).trim(),
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        id: generateId(),
        type: "heading3",
        text: line.slice(4).trim(),
      });
    } else if (line.startsWith("> ")) {
      blocks.push({
        id: generateId(),
        type: "quote",
        text: line.slice(2).trim(),
      });
    } else if (/^\d+\.\s+/.test(line)) {
      const text = line.replace(/^\d+\.\s+/, "").trim();
      blocks.push({ id: generateId(), type: "numbered", text });
    } else if (/^-\s+/.test(line)) {
      blocks.push({
        id: generateId(),
        type: "bulleted",
        text: line.replace(/^-+\s+/, "").trim(),
      });
    } else {
      blocks.push(createBlock("paragraph", line));
    }
    i += 1;
  }

  return blocks.length > 0 ? blocks : [createBlock("paragraph", "")];
}
