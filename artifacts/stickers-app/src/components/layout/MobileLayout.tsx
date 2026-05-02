import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Users, User } from "lucide-react";
import { useListChats, getListChatsQueryKey } from "@workspace/api-client-react";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: chats } = useListChats({
    query: { staleTime: 15000, queryKey: getListChatsQueryKey() },
  });

  const unreadCount = chats?.reduce((sum, c) => sum + ((c as any).unreadCount ?? 0), 0) ?? 0;

  const navItems = [
    { icon: Home, label: "Home", path: "/", badge: 0 },
    { icon: BookOpen, label: "Album", path: "/album", badge: 0 },
    { icon: Users, label: "Match", path: "/match", badge: unreadCount },
    { icon: User, label: "Profilo", path: "/profilo", badge: 0 },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1 pb-16 overflow-y-auto">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around h-16 px-2 pb-safe z-50">
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
      </nav>
    </div>
  );
}
