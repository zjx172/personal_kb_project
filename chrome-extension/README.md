# 个人知识库 Chrome 插件

快速保存网页内容到个人知识库的浏览器扩展。

## 功能

- 🔐 Google OAuth 登录
- 📄 一键保存当前网页到知识库
- 🎯 自动提取网页正文内容
- 📝 支持自定义标题

## 开发

### 安装依赖

```bash
pnpm install
```

### 开发模式（支持热更新）

```bash
# 启动开发服务器（自动监听文件变化）
pnpm dev
```

开发模式会：

- 自动监听文件变化
- 自动重新构建
- 在终端显示构建状态

### 加载插件到 Chrome

1. 运行 `pnpm dev` 启动开发模式
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `build/chrome-mv3-dev` 目录（开发模式下的构建目录）

### 热更新使用

**方法一：手动重载（推荐）**

- 修改代码后，Plasmo 会自动重新构建
- 在 `chrome://extensions/` 页面点击插件的"重新加载"按钮（🔄）
- 或者使用快捷键：`Cmd+R` (Mac) / `Ctrl+R` (Windows)

**方法二：自动重载（需要额外扩展）**

- 安装 [plasmo-reload](https://github.com/PlasmoHQ/plasmo-reload) Chrome 扩展
- 安装后，代码修改会自动触发插件重载

**调试技巧：**

- **Popup 调试**：右键点击插件图标 → "检查弹出内容"
- **Background 调试**：在 `chrome://extensions/` 中点击插件的"service worker"链接
- **查看日志**：在 DevTools Console 中查看 `console.log` 输出

### 构建生产版本

```bash
# 构建生产版本
pnpm build

# 打包为 .zip 文件（用于发布）
pnpm package
```

## 使用

1. 点击浏览器工具栏中的插件图标
2. 首次使用需要登录（使用 Google 账号）
3. 在任意网页点击"保存到知识库"按钮
4. 网页内容会自动提取并保存

## 开发热更新

详细开发指南请查看 [DEVELOPMENT.md](./DEVELOPMENT.md)

**快速开始：**

1. 运行 `pnpm dev` 启动开发服务器
2. 修改代码后，在 `chrome://extensions/` 中点击"重新加载"按钮
3. 重新打开 popup 查看变化

**提示**：安装 [plasmo-reload](https://github.com/PlasmoHQ/plasmo-reload) 扩展可实现自动重载。
