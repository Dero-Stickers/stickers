import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Home, BookOpen, Users, User } from "lucide-react";

export function MobileLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: BookOpen, label: "Album", path: "/album" },
    { icon: Users, label: "Match", path: "/match" },
    { icon: User, label: "Profilo", path: "/profilo" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around h-16 px-2 pb-safe z-50">
        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
