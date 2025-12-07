# Plasmo 开发说明

## 热更新使用

1. 运行 `pnpm dev` 启动开发模式
2. Plasmo 会自动监听文件变化并重新构建
3. 在 Chrome 扩展管理页面（chrome://extensions/）：
   - 确保"开发者模式"已开启
   - 点击插件的"重新加载"按钮（或使用快捷键）
   - 或者安装 [plasmo-reload](https://github.com/PlasmoHQ/plasmo-reload) 扩展实现自动重载

## 开发技巧

- 修改 `popup.tsx` 后，需要重新打开 popup 才能看到变化
- 修改 `background.ts` 后，需要重新加载扩展
- 使用 Chrome DevTools 调试：
  - Popup: 右键插件图标 → "检查弹出内容"
  - Background: chrome://extensions/ → 点击插件的"service worker"
