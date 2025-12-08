/**
 * 前端监控系统配置
 * 使用 Sentry 进行错误监控、性能监控和白屏检测
 */
import * as Sentry from "@sentry/react";

// Sentry 配置
const SENTRY_DSN = (import.meta as any).env?.VITE_SENTRY_DSN || "";
const SENTRY_ENVIRONMENT =
  (import.meta as any).env?.VITE_SENTRY_ENVIRONMENT || "development";
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(
  (import.meta as any).env?.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.1"
);

/**
 * 初始化 Sentry 监控
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn("SENTRY_DSN 未配置，Sentry 监控未启用");
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENVIRONMENT,
      integrations: [
        // 浏览器集成（捕获未处理的错误和性能监控）
        Sentry.browserTracingIntegration(),
        // 重放集成（记录用户操作）
        Sentry.replayIntegration({
          maskAllText: false, // 不屏蔽文本（可根据需要调整）
          blockAllMedia: false, // 不屏蔽媒体
        }),
      ],
      // 性能监控采样率
      tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
      // 会话重放采样率
      replaysSessionSampleRate: 0.1, // 10% 的会话会被记录
      replaysOnErrorSampleRate: 1.0, // 100% 的错误会话会被记录
      // 忽略某些错误
      ignoreErrors: [
        // 浏览器扩展错误
        "top.GLOBALS",
        "originalCreateNotification",
        "canvas.contentDocument",
        "MyApp_RemoveAllHighlights",
        "atomicFindClose",
        "fb_xd_fragment",
        "bmi_SafeAddOnload",
        "EBCallBackMessageReceived",
        "conduitPage",
      ],
      // 忽略某些 URL
      denyUrls: [
        // 浏览器扩展
        /extensions\//i,
        /^chrome:\/\//i,
        /^chrome-extension:\/\//i,
      ],
      // 设置用户信息（在登录后调用 setUser）
      beforeSend(event, hint) {
        // 可以在这里过滤或修改事件
        return event;
      },
    });

    console.log("Sentry 监控已初始化");
  } catch (error) {
    console.error("Sentry 初始化失败:", error);
  }
}

/**
 * 设置用户信息
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: any;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username || user.email,
  });
}

/**
 * 清除用户信息（登出时调用）
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * 手动捕获异常
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * 手动捕获消息
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info"
) {
  Sentry.captureMessage(message, level);
}

/**
 * 白屏检测（简化版）
 *
 * 注意：Sentry 的 Session Replay 已经可以很好地帮助发现白屏问题。
 * 这个检测主要用于捕获明显的白屏情况（比如路由错误导致的完全空白页面）。
 *
 * 对于 React 应用，更推荐依赖：
 * 1. Sentry Session Replay - 可以回放用户会话，直观看到白屏问题
 * 2. Sentry 错误监控 - 捕获导致白屏的 JavaScript 错误
 * 3. React Error Boundary - 捕获组件渲染错误
 */
export function initBlankScreenDetection() {
  // 只在页面加载完成后检测一次，避免误报
  // React 应用可能需要更长时间才能完全渲染
  const checkBlankScreen = () => {
    const root = document.getElementById("root");
    if (!root) {
      captureException(new Error("页面白屏检测：找不到 root 元素"), {
        url: window.location.href,
      });
      return;
    }

    // 检查 root 是否有内容（React 应用会在 root 内渲染）
    const hasContent =
      root.children.length > 0 ||
      (root.innerText || root.textContent || "").trim().length > 0;

    if (!hasContent) {
      // 延迟检测，给 React 更多时间渲染
      setTimeout(() => {
        const stillBlank =
          root.children.length === 0 &&
          (root.innerText || root.textContent || "").trim().length === 0;

        if (stillBlank) {
          captureException(new Error("页面白屏检测：页面加载后没有可见内容"), {
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
          });
        }
      }, 5000); // 5秒后再次检测，给 React 足够时间
    }
  };

  // 页面加载完成后检测
  if (document.readyState === "complete") {
    setTimeout(checkBlankScreen, 3000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(checkBlankScreen, 3000);
    });
  }
}

/**
 * JS 错误监控
 *
 * 注意：Sentry 已经自动捕获了以下错误，无需手动添加监听器：
 * 1. 全局未处理的错误（window.onerror）
 * 2. 未处理的 Promise 拒绝（unhandledrejection）
 * 3. React 组件错误（通过 @sentry/react 的 Error Boundary）
 *
 * 如果需要自定义错误处理，可以在 Sentry.init() 的 beforeSend 回调中处理。
 *
 * 这个函数保留为空，以保持 API 兼容性（如果其他地方调用了它）。
 */
export function initJSErrorMonitoring() {
  // Sentry 已经自动处理了所有错误监控
  // 无需手动添加事件监听器
}
