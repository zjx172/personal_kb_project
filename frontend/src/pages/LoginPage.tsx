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
  CheckCircle2,
  Users,
  Database,
  Lock,
  TrendingUp,
  Layers,
  MessageSquare,
  BookMarked,
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
      color: "from-blue-500/20 to-blue-600/10",
    },
    {
      icon: FileText,
      title: "文档管理",
      description: "在线编辑 Markdown 文档，支持标签分类",
      color: "from-purple-500/20 to-purple-600/10",
    },
    {
      icon: Brain,
      title: "AI 问答",
      description: "智能生成答案，自动引用相关文档",
      color: "from-pink-500/20 to-pink-600/10",
    },
    {
      icon: Globe,
      title: "网页提取",
      description: "一键提取网页内容，自动转换为文档",
      color: "from-green-500/20 to-green-600/10",
    },
    {
      icon: Layers,
      title: "多知识库",
      description: "支持创建多个知识库，分类管理不同主题",
      color: "from-orange-500/20 to-orange-600/10",
    },
    {
      icon: MessageSquare,
      title: "对话记录",
      description: "保存所有对话历史，随时回顾和继续",
      color: "from-cyan-500/20 to-cyan-600/10",
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: "安全可靠",
      description: "使用 Google OAuth 登录，数据加密存储",
    },
    {
      icon: Zap,
      title: "快速检索",
      description: "向量搜索 + 关键词搜索，秒级响应",
    },
    {
      icon: LinkIcon,
      title: "智能关联",
      description: "自动发现文档间的关系，构建知识图谱",
    },
    {
      icon: Database,
      title: "永久保存",
      description: "所有数据本地存储，永不丢失",
    },
  ];

  const stats = [
    { label: "知识库", value: "∞", description: "无限创建" },
    { label: "文档", value: "∞", description: "无限存储" },
    { label: "对话", value: "∞", description: "无限记录" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto pt-12 pb-16 relative z-10">
        {/* 标题区域 */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-5 rounded-full shadow-lg border border-primary/20">
                <BookOpen className="h-10 w-10 text-primary animate-in zoom-in duration-500" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            WisdomVault
          </h1>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
            智慧宝库
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            构建你的专属知识体系，让 AI 帮你快速找到答案
          </p>

          {/* 统计数据 */}
          <div className="flex justify-center gap-8 mt-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-3xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-foreground">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* 左侧：核心功能 */}
          <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
            <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  核心功能
                </CardTitle>
                <CardDescription>强大的功能帮助你高效管理知识</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={index}
                        className="flex gap-4 p-4 rounded-lg hover:bg-accent/50 transition-all duration-200 group border border-border/50 hover:border-primary/30"
                        style={{
                          animationDelay: `${index * 50}ms`,
                        }}
                      >
                        <div className="flex-shrink-0">
                          <div
                            className={`bg-gradient-to-br ${feature.color} p-3 rounded-lg group-hover:scale-110 transition-transform duration-200 shadow-sm`}
                          >
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    为什么选择我们
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {benefits.map((benefit, index) => {
                    const Icon = benefit.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 group"
                      >
                        <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">
                            {benefit.title}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    适用场景
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200">
                    <BookMarked className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold mb-1">学习笔记</p>
                      <p className="text-xs text-muted-foreground">
                        整理课程笔记、读书心得
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200">
                    <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold mb-1">工作文档</p>
                      <p className="text-xs text-muted-foreground">
                        管理项目文档、会议记录
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200">
                    <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold mb-1">知识沉淀</p>
                      <p className="text-xs text-muted-foreground">
                        积累专业知识、经验总结
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold mb-1">团队协作</p>
                      <p className="text-xs text-muted-foreground">
                        共享知识库，提升团队效率
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 右侧：登录卡片 */}
          <div className="lg:col-span-1 sticky top-8 animate-in fade-in slide-in-from-right-4 duration-700">
            <Card className="border-primary/20 shadow-2xl bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
              <CardHeader className="space-y-3 pb-6">
                <div className="flex justify-center mb-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
                    <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-4 rounded-full">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  开始使用
                </CardTitle>
                <CardDescription className="text-center text-base leading-relaxed">
                  使用 Google 账号登录，立即开始构建你的知识库
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-16 text-lg font-bold shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground border-0 relative overflow-hidden group"
                  size="lg"
                >
                  {/* 背景光效 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin relative z-10" />
                      <span className="relative z-10">正在跳转...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-3 h-7 w-7 relative z-10"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="#FFFFFF"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#FFFFFF"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span className="relative z-10">使用 Google 登录</span>
                    </>
                  )}
                </Button>

                <div className="space-y-4">
                  <div className="pt-4 border-t border-primary/10 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      <span>安全登录，数据加密保护</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      <span>隐私保护，数据仅你可见</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center leading-relaxed pt-2">
                    登录即表示你同意我们的服务条款
                  </p>
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
