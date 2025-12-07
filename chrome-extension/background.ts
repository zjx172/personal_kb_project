// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "savePage") {
    // 处理保存页面的逻辑
    sendResponse({ success: true });
  }
  return true;
});

// 监听 OAuth 回调
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    try {
      // 检查是否是 OAuth 回调 URL（前端或后端）
      if (tab.url.includes("/auth/callback") || tab.url.includes("token=")) {
        const url = new URL(tab.url);
        const token = url.searchParams.get("token");

        if (token) {
          // 保存 token
          await chrome.storage.local.set({ auth_token: token });

          // 关闭回调标签页（如果是 localhost）
          if (tab.url.includes("localhost")) {
            chrome.tabs.remove(tabId);
          }

          // 通知 popup 更新
          try {
            chrome.runtime.sendMessage({ action: "tokenUpdated" });
          } catch (e) {
            // popup 可能未打开，忽略错误
          }
        }
      }
    } catch (error) {
      // URL 解析失败，忽略
      console.error("Error parsing callback URL:", error);
    }
  }
});
