import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Users, User } from "lucide-react";
import { useListChats, getListChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSignal } from "@/hooks/useRealtimeSignal";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
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
    <div className="min-h-[100dvh] bg-muted/40">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md md:max-w-2xl flex-col bg-background md:shadow-xl">
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
        >{children}</main>

      {/* Tab bar nativa: riga icone piena da 4rem SOPRA la safe-area; lo sfondo
          della barra si estende sotto (home indicator) senza schiacciare le icone. */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-2xl bg-card border-t border-border z-50"
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
