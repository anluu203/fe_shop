"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { ApiRequestError } from "../api/client";
import { warrantyErrorMessage } from "../services/warranty";

export function useWarrantyErrorHandler() {
  const { logout } = useAuth();
  const router = useRouter();
  return useCallback((error: unknown) => {
    if (error instanceof ApiRequestError && error.status === 401) {
      logout();
      router.replace("/client/auth/login");
    }
    return warrantyErrorMessage(error);
  }, [logout, router]);
}

// Ignore responses from old filters/unmounted accounts; revalidate when returning to the tab.
export function useWarrantyResource<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({
    data: null, loading: true, error: "",
  });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const handleError = useWarrantyErrorHandler();

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      const data = await loader();
      if (active) setState({ data, loading: false, error: "" });
    }).catch((error: unknown) => {
      if (active) setState({ data: null, loading: false, error: handleError(error) });
    });
    return () => { active = false; };
  }, [loader, revision, handleError]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return { ...state, refresh };
}
