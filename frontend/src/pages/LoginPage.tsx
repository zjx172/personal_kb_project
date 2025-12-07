import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { getGoogleAuthUrl, getCurrentUser } from "../api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  BookOpen,
  Sparkles,
  Search,
  FileText,
  Brain,
  Globe,
  Shield,
  Zap,
  Link as LinkIcon,
} from "lucide-react";

const LoginPage: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 检查是否有错误（从回调中获取）
    const error = searchParams.get("error");
    if (error) {
      setLoading(false);
      toast.error(`登录失败: ${decodeURIComponent(error)}`);
      navigate("/login", { replace: true });
      return;
    }

    // 检查是否有 token（从回调中获取）
    const token = searchParams.get("token");
    if (token) {
      setLoading(true);
      localStorage.setItem("auth_token", token);
      // 获取用户信息
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          toast.success("登录成功");
          // 清除 URL 中的 token 参数
          navigate("/", { replace: true });
        })
        .catch((error) => {
          console.error("获取用户信息失败:", error);
          toast.error("登录失败，请重试");
          localStorage.removeItem("auth_token");
          // 清除 URL 中的 token 参数
          navigate("/login", { replace: true });
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (user) {
      // 如果已经登录，重定向到首页
      navigate("/", { replace: true });
    }
  }, [searchParams, user, setUser, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const response = await getGoogleAuthUrl();
      console.log("获取到的授权 URL:", response);

      if (!response.authorization_url) {
        toast.error("无法获取授权 URL，请检查后端配置");
        setLoading(false);
        return;
      }

      // 重定向到 Google 登录页面
      window.location.href = response.authorization_url;
    } catch (error: any) {
      console.error("登录失败:", error);
      const errorMessage =
        error?.response?.data?.detail || error?.message || "登录失败，请重试";
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Search,
      title: "智能搜索",
      description: "基于 RAG 技术，快速检索知识库内容",
    },
    {
      icon: FileText,
      title: "文档管理",
      description: "在线编辑 Markdown 文档，支持标签分类",
    },
    {
      icon: Brain,
      title: "AI 问答",
      description: "智能生成答案，自动引用相关文档",
    },
    {
      icon: Globe,
      title: "网页提取",
      description: "一键提取网页内容，自动转换为文档",
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto pt-8">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">个人知识库</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            构建你的专属知识体系，让 AI 帮你快速找到答案
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* 左侧：功能介绍 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">核心功能</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="bg-primary/10 p-2 rounded-lg">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">为什么选择我们</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">安全可靠</p>
                    <p className="text-xs text-muted-foreground">
                      使用 Google OAuth 登录，数据加密存储
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">快速检索</p>
                    <p className="text-xs text-muted-foreground">
                      向量搜索 + 关键词搜索，秒级响应
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <LinkIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">智能关联</p>
                    <p className="text-xs text-muted-foreground">
                      自动发现文档间的关系，构建知识图谱
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：登录卡片 */}
          <div className="sticky top-8">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-xl font-bold text-center">
                  开始使用
                </CardTitle>
                <CardDescription className="text-center">
                  使用 Google 账号登录，立即开始构建你的知识库
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      正在跳转...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-5 w-5"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
                    </>
                  )}
                </Button>
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    登录即表示你同意我们的服务条款
                  </p>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span>• 免费使用</span>
                    <span>• 数据私有</span>
                    <span>• 随时导出</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
