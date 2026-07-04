import { ReactNode, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Zap, MessageCircle, User, ShieldAlert, X } from "lucide-react";
import { useListChats, getListChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";
import { useScrollResetOnNavigate } from "@/hooks/useScrollResetOnNavigate";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useScrollResetOnNavigate(mainRef);
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: chats } = useListChats({
    query: { staleTime: 15000, queryKey: getListChatsQueryKey() },
  });

  // Realtime: a ogni nuovo messaggio ricevuto in una qualsiasi chat, aggiorna
  // la lista (badge non-letti). Topic per-utente, segnale senza contenuto.
  useRealtimeSignal(
    currentUser ? `user:${currentUser.id}` : null,
    () => queryClient.invalidateQueries({ queryKey: getListChatsQueryKey() }),
  );

  const unreadCount = chats?.reduce((sum, c) => sum + ((c as any).unreadCount ?? 0), 0) ?? 0;

  // Avviso "sotto revisione": generico, staccato dalla singola chat, così non
  // rivela chi ha segnalato. Chiudibile per la sessione (non martellante).
  const [reviewDismissed, setReviewDismissed] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("review_banner_dismissed") === "1",
  );
  const showReviewBanner = Boolean((currentUser as any)?.underReview) && !reviewDismissed;

  const navItems = [
    { icon: Home, label: "Home", path: "/", badge: 0 },
    { icon: BookOpen, label: "Album", path: "/album", badge: 0 },
    { icon: Zap, label: "Match", path: "/match", badge: 0 },
    { icon: MessageCircle, label: "Messaggi", path: "/messaggi", badge: unreadCount },
    { icon: User, label: "Profilo", path: "/profilo", badge: 0 },
  ];

  return (
    // Su desktop/tablet l'app resta centrata in una colonna stile mobile
    // (max ~448px) con sfondo neutro ai lati; su telefono occupa tutto lo schermo.
    <div className="h-full bg-muted/40">
      <div className="relative mx-auto flex h-full w-full max-w-md md:max-w-2xl flex-col overflow-hidden bg-background md:shadow-xl">
        {showReviewBanner && (
          <div className="shrink-0 flex items-start gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs leading-snug flex-1">
              Alcune tue conversazioni sono sotto revisione. Ricorda di mantenere un
              comportamento corretto: le violazioni possono portare al blocco dell'account.
            </p>
            <button
              type="button"
              aria-label="Chiudi avviso"
              className="shrink-0 -mr-1 p-0.5 text-amber-500 hover:text-amber-700"
              onClick={() => {
                setReviewDismissed(true);
                try { sessionStorage.setItem("review_banner_dismissed", "1"); } catch { /* no-op */ }
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <main
          ref={mainRef}
          className="flex-1 min-h-0 overflow-hidden"
        >{children}</main>

      {/* Tab bar nativa: parte FISSA della colonna (non più position:fixed) —
          riga icone piena da 4rem SOPRA la safe-area; lo sfondo si estende sotto
          (home indicator) senza schiacciare le icone. */}
      <nav
        className="shrink-0 w-full bg-card border-t border-border z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center min-w-0 flex-1 h-full gap-1 relative ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="relative">
                {/* Match: da attivo il fulmine è arancione PIENO (fill accent del
                    logo) con un sottile CONTORNO BLU (stroke primary); le altre
                    icone seguono il colore del testo. */}
                <item.icon
                  className={`h-5 w-5 ${isActive && item.path === "/match" ? "fill-accent text-primary" : ""}`}
                  strokeWidth={isActive && item.path === "/match" ? 0.75 : undefined}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center leading-none">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none tracking-tight w-full text-center truncate px-0.5">{item.label}</span>
            </Link>
          );
        })}
        </div>
      </nav>
      </div>
    </div>
  );
}
