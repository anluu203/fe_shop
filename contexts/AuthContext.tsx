"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { authApi } from "../lib/api/auth";
import type { User } from "../lib/types";
import { AUTH_TOKEN_KEY } from "../lib/mock/config";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục phiên khi load app
  useEffect(() => {
    let savedToken: string | null = null;
    try {
      savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      /* Browser may block persistent storage. */
    }
    if (!savedToken) {
      setIsLoading(false);
      return;
    }
    setToken(savedToken);
    authApi
      .me()
      .then((u) => setUser(u))
      .catch(() => {
        // Token hết hạn hoặc không hợp lệ
        try {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        } catch {}
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // A browser shares its demo session across tabs; keep the visible account in sync.
  useEffect(() => {
    let revision = 0;
    const syncSession = (event: StorageEvent) => {
      if (event.key !== AUTH_TOKEN_KEY && event.key !== null) return;
      const current = ++revision;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {}
      if (!saved) {
        setUser(null);
        setToken(null);
        return;
      }
      authApi
        .me()
        .then((account) => {
          if (current === revision) {
            setToken(saved);
            setUser(account);
          }
        })
        .catch(() => {
          if (current === revision) {
            setToken(null);
            setUser(null);
          }
        });
    };
    window.addEventListener("storage", syncSession);
    return () => {
      revision++;
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    } catch {
      throw new Error(
        "Trình duyệt không cho phép lưu phiên đăng nhập. Vui lòng bật lưu trữ cho website.",
      );
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin: user?.role === "ADMIN",
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
