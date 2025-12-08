import type { PlasmoConfig } from "plasmo";

/**
 * Plasmo 配置文件
 * Plasmo 默认支持热更新，运行 pnpm dev 后会自动监听文件变化
 */
const config: PlasmoConfig = {
  // 开发模式会自动启用热更新
  // 修改文件后，在 chrome://extensions/ 中点击重载按钮即可
  
  // 图标配置 - Plasmo 会自动从 assets/icon.png 或 assets/icon.svg 生成所需尺寸
};

export default config;
