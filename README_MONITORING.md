# 监控系统配置指南

本项目集成了 Sentry 错误监控和 Prometheus 性能监控系统。

## 后端监控

### 1. Sentry 错误监控

#### 安装依赖

```bash
cd backend
pip install sentry-sdk[fastapi]
```

#### 配置环境变量

在 `.env` 文件中添加：

```env
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=development  # 或 production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 性能监控采样率 (0.0-1.0)
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 性能分析采样率 (0.0-1.0)
```

#### 功能

- 自动捕获未处理的异常
- 记录 SQLAlchemy 查询错误
- 记录 FastAPI 请求错误
- 性能追踪（APM）
- 用户上下文信息

### 2. Prometheus 性能监控

#### 安装依赖

```bash
pip install prometheus-client
```

#### 访问指标

启动服务后，访问 `http://localhost:8000/metrics` 查看 Prometheus 指标。

#### 指标说明

- `http_requests_total`: HTTP 请求总数（按方法、端点、状态码分类）
- `http_request_duration_seconds`: HTTP 请求持续时间（按方法、端点分类）
- `http_requests_in_progress`: 当前正在进行的 HTTP 请求数

#### 集成 Grafana

可以将 `/metrics` 端点配置到 Prometheus，然后在 Grafana 中可视化。

## 前端监控

### 1. Sentry 错误监控

#### 安装依赖

```bash
cd frontend
pnpm add @sentry/react @sentry/tracing
```

#### 配置环境变量

在 `.env` 文件中添加：

```env
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_SENTRY_ENVIRONMENT=development  # 或 production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1  # 性能监控采样率 (0.0-1.0)
```

#### 功能

- **JS 错误监控**: 自动捕获 JavaScript 错误和未处理的 Promise 拒绝
- **白屏检测**: 自动检测页面白屏问题
- **资源加载错误**: 监控图片、CSS、JS 等资源加载失败
- **性能监控**: 追踪页面加载时间和 API 请求性能
- **会话重放**: 记录用户操作，便于复现问题
- **用户上下文**: 自动关联用户信息到错误报告

### 2. 白屏检测

系统会在以下情况检测白屏：

- 页面加载 3 秒后没有可见内容
- 页面从隐藏变为可见时没有内容

检测到白屏时会自动上报到 Sentry。

### 3. JS 错误监控

自动监控：

- 全局未处理的 JavaScript 错误
- 未处理的 Promise 拒绝
- 资源加载错误（图片、CSS、JS 等）

## 获取 Sentry DSN

1. 访问 [https://sentry.io](https://sentry.io)
2. 注册/登录账号
3. 创建新项目（选择 FastAPI 和 React）
4. 复制 DSN 到环境变量

## 监控最佳实践

1. **开发环境**: 设置较低的采样率（0.1）以减少噪音
2. **生产环境**: 可以适当提高采样率（0.5-1.0）以捕获更多问题
3. **敏感信息**: 确保不记录敏感的用户数据（密码、token 等）
4. **错误过滤**: 在 `monitoring.py` 和 `monitoring.ts` 中配置 `ignoreErrors` 过滤无关错误

## 查看监控数据

1. 登录 Sentry 控制台
2. 选择对应的项目
3. 查看 Issues、Performance、Replays 等模块

## 手动上报错误

### 后端

```python
import sentry_sdk
sentry_sdk.capture_exception(exception)
sentry_sdk.capture_message("Something went wrong", level="error")
```

### 前端

```typescript
import { captureException, captureMessage } from "./utils/monitoring";

// 捕获异常
captureException(error, { context: "additional info" });

// 捕获消息
captureMessage("Something went wrong", "error");
```
