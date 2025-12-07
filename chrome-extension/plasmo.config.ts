import type { PlasmoConfig } from "plasmo";

/**
 * Plasmo 配置文件
 * Plasmo 默认支持热更新，运行 pnpm dev 后会自动监听文件变化
 */
const config: PlasmoConfig = {
  // 开发模式会自动启用热更新
  // 修改文件后，在 chrome://extensions/ 中点击重载按钮即可
};

export default config;
