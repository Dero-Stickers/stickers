import { ReactNode, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Users, User } from "lucide-react";
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

  const navItems = [
    { icon: Home, label: "Home", path: "/", badge: 0 },
    { icon: BookOpen, label: "Album", path: "/album", badge: 0 },
    { icon: Users, label: "Match", path: "/match", badge: unreadCount },
    { icon: User, label: "Profilo", path: "/profilo", badge: 0 },
  ];

  return (
    // Su desktop/tablet l'app resta centrata in una colonna stile mobile
    // (max ~448px) con sfondo neutro ai lati; su telefono occupa tutto lo schermo.
    <div className="h-full bg-muted/40">
      <div className="relative mx-auto flex h-full w-full max-w-md md:max-w-2xl flex-col overflow-hidden bg-background md:shadow-xl">
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
        <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        </div>
      </nav>
      </div>
    </div>
  );
}
