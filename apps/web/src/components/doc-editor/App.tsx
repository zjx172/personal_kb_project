import React, { useRef } from "react";
import FeishuDocEditor, { type FeishuDocEditorHandle } from "./DocEditor";
import "./doc-editor.css";

const App: React.FC = () => {
  const editorRef = useRef<FeishuDocEditorHandle | null>(null);

  return (
    <div>
      <FeishuDocEditor ref={editorRef} />
      <div style={{ padding: 16 }}>
        <button
          onClick={() => {
            if (!editorRef.current) return;
            const md = editorRef.current.exportMarkdown();
            console.log(md);
            alert("已导出 Markdown，查看 console 输出");
          }}
        >
          导出 Markdown（console）
        </button>
      </div>
    </div>
  );
};

export default App;
