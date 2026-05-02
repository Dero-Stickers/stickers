import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const USER_ACCOUNT = { nickname: "mario75", pin: "1234" };
const ADMIN_ACCOUNT = { nickname: "admin", pin: "0000" };

export function DevQuickSwitch() {
  const { currentUser, login, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  if (!import.meta.env.DEV) return null;

  const isAdmin = currentUser?.isAdmin === true;
  const target = isAdmin ? USER_ACCOUNT : ADMIN_ACCOUNT;
  const nextLetter = isAdmin ? "U" : "A";
  const label = isAdmin ? "Switch a User" : "Switch a Admin";

  const handleSwitch = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!res.ok) {
        logout();
        setLocation("/");
        return;
      }
      const data = await res.json();
      login(data.user, data.token);
      setLocation(data.user.isAdmin ? "/admin" : "/");
    } catch {
      // ignore — keep current session
    } finally {
      setLoading(false);
    }
  };

  const colorClasses = isAdmin
    ? "bg-blue-600 hover:bg-blue-700 border-blue-700"
    : "bg-purple-600 hover:bg-purple-700 border-purple-700";

  return (
    <button
      type="button"
      onClick={handleSwitch}
      disabled={loading}
      title={`DEV — ${label}`}
      aria-label={label}
      className={`fixed right-4 z-[9999] h-12 w-12 rounded-full shadow-xl border-2 text-white font-black text-lg flex items-center justify-center transition-all active:scale-95 disabled:opacity-60 ${colorClasses}`}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      {loading ? "…" : nextLetter}
    </button>
  );
}
