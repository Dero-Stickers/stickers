import { useEffect, useState } from "react";
import logoUrl from "/logo.svg?url";

const SPLASH_KEY = "sticker_splash_shown";
const TOTAL_MS = 4500;
const FADE_OUT_MS = 600;

export function SplashScreen() {
  const [shouldShow, setShouldShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!shouldShow) return;
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      // ignore quota / privacy mode
    }
    const fadeTimer = window.setTimeout(
      () => setFadingOut(true),
      TOTAL_MS - FADE_OUT_MS,
    );
    const removeTimer = window.setTimeout(() => setShouldShow(false), TOTAL_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-background ${
        fadingOut ? "splash-fade-out" : "splash-fade-in"
      }`}
      style={{ pointerEvents: "none" }}
    >
      <img
        src={logoUrl}
        alt=""
        className="w-2/3 max-w-xs h-auto select-none"
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
