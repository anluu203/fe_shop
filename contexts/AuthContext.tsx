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
import { USE_MOCK } from "../lib/mock/config";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khôi phục phiên khi load app
  useEffect(() => {
    let active = true;
    async function restore() {
      let savedToken: string | null = null;
      try { savedToken = localStorage.getItem(AUTH_TOKEN_KEY); } catch {}
      if (!savedToken) return null;
      try { return { token: savedToken, user: await authApi.me() }; }
      catch { try { if (localStorage.getItem(AUTH_TOKEN_KEY) === savedToken) localStorage.removeItem(AUTH_TOKEN_KEY); } catch {} return null; }
    }
    restore().then((session) => {
      if (!active) return;
      setToken(session?.token ?? null); setUser(session?.user ?? null); setIsLoading(false);
    });
    return () => { active = false; };
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

  useEffect(() => {
    const expired = () => { setToken(null); setUser(null); };
    window.addEventListener("bookstore:session-expired", expired);
    return () => window.removeEventListener("bookstore:session-expired", expired);
  }, []);

  const logout = useCallback(async () => {
    if (!USE_MOCK) {
      try { await authApi.logout(); }
      catch (error) { window.alert(error instanceof Error ? error.message : "Chưa thu hồi được phiên trên server. Vui lòng thử lại."); return; }
    }
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
