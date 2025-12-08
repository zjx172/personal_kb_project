import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { getCurrentUser, User } from "../api";
import { setSentryUser, clearSentryUser } from "../utils/monitoring";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      // 验证 token 并获取用户信息
      getCurrentUser()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          // 设置 Sentry 用户信息
          setSentryUser({
            id: userData.id,
            email: userData.email,
            username: userData.name || userData.email,
          });
        })
        .catch(() => {
          // Token 无效，清除
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // 尝试从 localStorage 恢复用户信息
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("user");
        }
      }
      setLoading(false);
    }
  }, []);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
      // 设置 Sentry 用户信息
      setSentryUser({
        id: newUser.id,
        email: newUser.email,
        username: newUser.name || newUser.email,
      });
    } else {
      localStorage.removeItem("user");
      // 清除 Sentry 用户信息
      clearSentryUser();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    setUser(null);
    // 清除 Sentry 用户信息
    clearSentryUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser: handleSetUser,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
