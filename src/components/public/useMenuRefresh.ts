"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useMenuRefresh(enabled = true) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [router, enabled]);
}
