
# Feishu-like Doc Editor（简化架构版）

这是一个**照着飞书文档「块级架构」思路实现的简化版富文本编辑器**，主要特点是：

- 文档由一组 **Block** 组成（类似飞书 / 语雀的文档块模型）
  - `paragraph` 文本
  - `heading1 / heading2 / heading3`
  - `quote` 引用
  - `bulleted / numbered` 列表
  - `ref` 引用块（可在大纲中定位）
- 每个 Block 用一个 `contentEditable` 容器渲染
- 有一个简单的 **工具栏** 切换块类型 / 应用粗体、斜体、行内代码
- 右侧有 **大纲面板**，会根据 Block 构建大纲
  - 光标所在块 → 对应大纲项高亮
  - 点击大纲项 → 滚动到对应块 + 闪烁高亮
- 支持把 Block Model 导出为**近似 Markdown** 文本

> 注意：这是「架构/模型」的示例，不是完整的 WYSIWYG 编辑器实现。
> 真正的飞书文档还包含：协同、光标同步、历史版本、复杂粘贴等。

## 文件结构

- `docModel.ts`
  - 定义 `DocBlock` / `BlockType` / `OutlineItem`
  - `buildOutline(blocks)`：从 block 列表生成大纲
  - `blocksToMarkdown(blocks)`：导出简化版 markdown
- `FeishuDocEditor.tsx`
  - 主编辑器组件
  - `contentEditable` 的块级编辑体验
  - 工具栏（粗体、斜体、代码、块类型）
  - 大纲高亮 + 定位
- `doc-editor.css`
  - 布局 + 块样式 + 大纲样式 + 高亮效果
- `App.tsx`
  - Demo：渲染编辑器，提供「导出 Markdown」按钮

## 使用方式

1. 复制以下文件到你的 React/TS 项目中：

- `docModel.ts`
- `FeishuDocEditor.tsx`
- `doc-editor.css`

2. 在你的页面中使用：

```tsx
import React, { useRef } from "react";
import FeishuDocEditor, {
  FeishuDocEditorHandle,
} from "./FeishuDocEditor";
import "./doc-editor.css";

const Page: React.FC = () => {
  const editorRef = useRef<FeishuDocEditorHandle | null>(null);

  return (
    <div>
      <FeishuDocEditor
        ref={editorRef}
        onChangeBlocks={(blocks) => {
          console.log("blocks changed", blocks);
        }}
      />

      <button
        onClick={() => {
          if (!editorRef.current) return;
          const md = editorRef.current.exportMarkdown();
          console.log("Markdown: \n", md);
        }}
      >
        导出 Markdown
      </button>
    </div>
  );
};

export default Page;
```

## 架构说明（对标飞书文档的思路）

- **Block Model 是一等公民**
  - 文档不是一坨字符串，而是 `DocBlock[]`
  - 每个块描述其类型（段落 / 标题 / 引用 / 列表 / 引用块）+ 文本
- **视图层是 Block → DOM 的映射**
  - 每个 block 对应一个 `<div class="doc-block">`
  - 内部是 `contentEditable` 的 `<div class="doc-block-inner">`
  - 切换块类型只是更新 `DocBlock.type`，React 负责重新渲染样式
- **大纲是 Block Model 的派生数据**
  - 不从 DOM 反向分析，而是对 `blocks` 做纯函数 `buildOutline`
  - 任何时候 `blocks` 变了，大纲自动更新
- **定位 / 高亮通过 Block Id 完成**
  - 大纲项、Block DOM、业务逻辑之间都通过 `block.id` 关联
  - 点击大纲 → 找到对应 `blockRefs[id]` → `scrollIntoView + 高亮`

在这个基础上，你可以继续往「真飞书」方向演进：

- 对 Block 增加 children 字段，支持嵌套结构（list → listItem 等）
- 把 inline 也改成「marks」模型，而不是直接用 `execCommand`
- 引入 Slash Menu（输入 `/` 弹出菜单）
- 定制 Selection / Range 管理，做更细粒度的格式操作
