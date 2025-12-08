# Chrome 插件开发指南

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发模式

```bash
pnpm dev
```

这会启动 Plasmo 开发服务器，自动监听文件变化并重新构建。

### 3. 加载插件到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录

## 热更新工作流

### 方法一：手动重载（推荐）

1. 运行 `pnpm dev` 启动开发服务器
2. 修改代码文件（`popup.tsx`、`background.ts` 等）
3. Plasmo 会自动检测变化并重新构建（终端会显示构建状态）
4. 在 `chrome://extensions/` 页面点击插件的"重新加载"按钮（🔄）
5. 重新打开 popup 查看变化

**快捷键**：

- Mac: `Cmd + R` 在扩展管理页面重载
- Windows/Linux: `Ctrl + R` 在扩展管理页面重载

### 方法二：自动重载（需要额外工具）

安装 [plasmo-reload](https://github.com/PlasmoHQ/plasmo-reload) Chrome 扩展：

1. 访问 [plasmo-reload 发布页面](https://github.com/PlasmoHQ/plasmo-reload/releases)
2. 下载并安装扩展
3. 安装后，代码修改会自动触发插件重载

## 调试技巧

### Popup 调试

1. 右键点击浏览器工具栏中的插件图标
2. 选择"检查弹出内容"
3. 打开 DevTools，可以：
   - 查看 Console 日志
   - 检查元素
   - 调试 React 组件（如果安装了 React DevTools）

### Background Script 调试

1. 访问 `chrome://extensions/`
2. 找到你的插件
3. 点击"service worker"链接（或"背景页"）
4. 打开 DevTools，可以：
   - 查看 Console 日志
   - 设置断点调试
   - 查看网络请求

### Content Script 调试

1. 在任意网页按 `F12` 打开 DevTools
2. 在 Console 中可以看到 content script 的日志
3. 注意：content script 运行在网页的上下文中

## 常见问题

### Q: 修改代码后没有看到变化？

A:

1. 确保 `pnpm dev` 正在运行
2. 检查终端是否有构建错误
3. 在 `chrome://extensions/` 中点击"重新加载"按钮
4. 对于 popup，需要关闭后重新打开才能看到变化

### Q: Background script 没有更新？

A: Background script 修改后必须重新加载扩展才能生效。点击扩展管理页面的"重新加载"按钮。

### Q: 如何查看构建输出？

A: 构建后的文件在 `build/chrome-mv3-dev/` 目录中，可以查看生成的文件。

### Q: 开发时如何保持登录状态？

A: Token 存储在 Chrome Storage 中，重新加载扩展不会清除。如果遇到问题，可以在 popup 中点击登录重新获取 token。

## 文件结构说明

```
chrome-extension/
├── popup.tsx          # 插件弹窗 UI（修改后需重新打开 popup）
├── background.ts      # 后台脚本（修改后需重新加载扩展）
├── content.ts         # 内容脚本（修改后需刷新网页）
├── options.tsx        # 设置页面
├── utils/
│   └── api.ts         # API 封装
└── popup.css          # 样式文件
```

## 开发最佳实践

1. **保持开发服务器运行**：`pnpm dev` 应该一直运行
2. **使用浏览器书签**：将 `chrome://extensions/` 加入书签，方便快速访问
3. **使用快捷键**：在扩展管理页面使用 `Cmd/Ctrl + R` 快速重载
4. **检查终端输出**：构建错误会在终端显示
5. **使用 DevTools**：充分利用 Chrome DevTools 进行调试

## 生产构建

```bash
# 构建生产版本
pnpm build

# 打包为 .zip（用于发布到 Chrome Web Store）
pnpm package
```

生产构建输出在 `build/chrome-mv3-prod/` 目录。
