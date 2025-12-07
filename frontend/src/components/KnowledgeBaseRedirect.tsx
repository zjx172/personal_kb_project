import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { listKnowledgeBases } from "../api";
import { Loader2 } from "lucide-react";

/**
 * 重定向组件：当访问根路径时，重定向到默认知识库
 */
export const KnowledgeBaseRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    const redirect = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const knowledgeBases = await listKnowledgeBases();
        if (knowledgeBases.length > 0) {
          navigate(`/kb/${knowledgeBases[0].id}`, { replace: true });
        } else {
          // 如果没有知识库，停留在首页（会显示创建知识库的提示）
          navigate("/kb", { replace: true });
        }
      } catch (error) {
        console.error("加载知识库失败:", error);
        navigate("/kb", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    redirect();
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return null;
};
