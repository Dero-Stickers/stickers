import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronUp, ChevronDown, User, Shield, Zap } from "lucide-react";

const DEV_USERS = [
  { nickname: "mario75", pin: "1234", label: "mario75", role: "demo_active", isAdmin: false },
  { nickname: "luca_fan", pin: "5678", label: "luca_fan", role: "premium", isAdmin: false },
  { nickname: "giulia_stickers", pin: "9999", label: "giulia_stickers", role: "free", isAdmin: false },
  { nickname: "sofia_ro", pin: "1111", label: "sofia_ro", role: "demo_expired", isAdmin: false },
  { nickname: "roberto_collector", pin: "2222", label: "roberto_collector", role: "premium", isAdmin: false },
  { nickname: "admin", pin: "0000", label: "admin", role: "admin", isAdmin: true },
];

const ROLE_COLORS: Record<string, string> = {
  demo_active: "bg-blue-100 text-blue-700",
  premium: "bg-amber-100 text-amber-700",
  free: "bg-gray-100 text-gray-600",
  demo_expired: "bg-red-100 text-red-600",
  admin: "bg-purple-100 text-purple-700",
};

export function DevSwitcher() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { login, currentUser } = useAuth();
  const [, setLocation] = useLocation();

  const switchTo = async (user: typeof DEV_USERS[0]) => {
    if (loading) return;
    setLoading(user.nickname);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: user.nickname, pin: user.pin }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        setOpen(false);
        setLocation(user.isAdmin ? "/admin" : "/");
      }
    } finally {
      setLoading(null);
    }
  };

  const currentRole = currentUser?.isAdmin
    ? "admin"
    : currentUser?.demoStatus ?? "free";

  return (
    <div className="fixed bottom-20 right-3 z-[9999] flex flex-col items-end gap-1">
      {open && (
        <div className="bg-white border border-border rounded-xl shadow-xl p-2 w-52 mb-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 mb-1">
            Dev — Cambia utente
          </p>
          <div className="space-y-0.5">
            {DEV_USERS.map(u => {
              const isActive = currentUser?.nickname === u.nickname;
              return (
                <button
                  key={u.nickname}
                  onClick={() => switchTo(u)}
                  disabled={isActive || loading === u.nickname}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold cursor-default"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {u.isAdmin ? (
                      <Shield className="h-3 w-3 text-purple-600" />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="font-mono">{u.nickname}</span>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>
                    {loading === u.nickname ? "..." : isActive ? "attivo" : u.role}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-border/50 mt-2 pt-1.5 px-2">
            <p className="text-[9px] text-muted-foreground">
              Connesso come <span className="font-mono font-bold">{currentUser?.nickname ?? "—"}</span>
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg border text-xs font-bold transition-all
          ${currentRole === "admin"
            ? "bg-purple-600 text-white border-purple-700"
            : "bg-sidebar text-sidebar-foreground border-sidebar-border"
          }`}
        title="Dev: cambia utente"
      >
        <Zap className="h-3 w-3" />
        <span className="font-mono hidden sm:inline">{currentUser?.nickname ?? "login"}</span>
        <span className={`text-[9px] px-1 py-0.5 rounded-full hidden sm:inline ${ROLE_COLORS[currentRole] ?? "bg-gray-100 text-gray-600"}`}>
          {currentRole}
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
}
