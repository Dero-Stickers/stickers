declare global {
  interface Window {
    __splashUntil?: number;
  }
}

const FADE_OUT_MS = 600;

export function dismissBootSplash() {
  if (typeof window === "undefined") return;
  const el = document.getElementById("boot-splash");
  if (!el) return;
  const now = performance.now();
  const until = window.__splashUntil ?? 0;
  const remaining = Math.max(0, until - now);
  window.setTimeout(() => {
    el.classList.add("boot-splash-hide");
    window.setTimeout(() => el.parentNode?.removeChild(el), FADE_OUT_MS);
  }, remaining);
}

export function SplashScreen() {
  return null;
}
