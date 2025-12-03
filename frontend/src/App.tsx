import React, { useState } from "react";
import KnowledgeBase from "./KnowledgeBase";
import DocEditor from "./DocEditor";

type MainTab = "docs-edit" | "kb-view";

const App: React.FC = () => {
  const [tab, setTab] = useState<MainTab>("docs-edit");

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="h-10 flex items-center justify-between px-4 border-b bg-white">
        <div className="text-sm font-semibold text-gray-800">
          Personal KB · 学习助手
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className={`px-2 py-1 rounded ${
              tab === "docs-edit"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setTab("docs-edit")}
          >
            文档编辑
          </button>
          <button
            className={`px-2 py-1 rounded ${
              tab === "kb-view"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setTab("kb-view")}
          >
            知识库阅读
          </button>
        </div>
      </header>

      <div className="flex-1">
        {/* {tab === "docs-edit" ? <DocEditor /> : <KnowledgeBase />} */}
        {<DocEditor /> }
      </div>
    </div>
  );
};

export default App;
