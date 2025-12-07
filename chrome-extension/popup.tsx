import React, { useEffect, useState } from "react";
import { getCurrentUser, getToken, extractWebContent } from "./utils/api";
import "./popup.css";

function IndexPopup() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    checkAuth();

    // 监听来自 background 的 token 更新消息
    const messageListener = (message: any) => {
      if (message.action === "tokenUpdated") {
        checkAuth();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userData = await getCurrentUser();
        setUser(userData);
      }
    } catch (error: any) {
      if (error.message === "UNAUTHORIZED") {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const { getGoogleAuthUrl } = await import("./utils/api");
      const { authorization_url } = await getGoogleAuthUrl();

      // 打开新标签页进行登录
      chrome.tabs.create({ url: authorization_url });

      // 监听存储变化
      const storageListener = (changes: {
        [key: string]: chrome.storage.StorageChange;
      }) => {
        if (changes.auth_token && changes.auth_token.newValue) {
          chrome.storage.onChanged.removeListener(storageListener);
          checkAuth();
        }
      };

      chrome.storage.onChanged.addListener(storageListener);

      // 30秒后移除监听
      setTimeout(() => {
        chrome.storage.onChanged.removeListener(storageListener);
      }, 30000);
    } catch (error) {
      console.error("登录失败:", error);
      setMessage("登录失败，请重试");
    }
  };

  const handleSavePage = async () => {
    setSaving(true);
    setMessage("");

    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.url) {
        setMessage("无法获取当前页面 URL");
        setSaving(false);
        return;
      }

      // 提取网页内容
      const doc = await extractWebContent({
        url: tab.url,
        title: tab.title || undefined,
      });

      setMessage(`✅ 已保存到知识库：${doc.title}`);

      // 3秒后关闭弹窗
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (error: any) {
      console.error("保存失败:", error);
      if (error.message === "UNAUTHORIZED") {
        setMessage("请先登录");
        setUser(null);
      } else {
        setMessage(`保存失败：${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="popup-container login-state">
        <div className="header">
          <h2>WisdomVault</h2>
          <p className="subtitle">请先登录以使用</p>
        </div>
        <div className="content">
          <button className="btn btn-primary" onClick={handleLogin}>
            <svg
              className="google-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            使用 Google 登录
          </button>
          {message && <div className="message error">{message}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="header">
        <div className="user-info">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="avatar" />
          ) : (
            <div className="avatar avatar-placeholder">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="user-details">
            <h2>WisdomVault</h2>
            <p className="user-name">{user.name || user.email}</p>
          </div>
        </div>
      </div>

      <div className="content">
        <button
          className="btn btn-primary btn-large"
          onClick={handleSavePage}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner"></span>
              保存中...
            </>
          ) : (
            <>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              保存当前页面
            </>
          )}
        </button>

        {message && (
          <div
            className={`message ${
              message.startsWith("✅") ? "success" : "error"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default IndexPopup;
