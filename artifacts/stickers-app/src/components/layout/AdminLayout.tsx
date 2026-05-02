import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, BookOpen, Star, Users, MessageSquare, Crown, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { icon: BarChart2, label: "Dashboard", path: "/admin" },
    { icon: BookOpen, label: "Album", path: "/admin/album" },
    { icon: Star, label: "Figurine", path: "/admin/figurine" },
    { icon: Users, label: "Utenti", path: "/admin/utenti" },
    { icon: MessageSquare, label: "Messaggi", path: "/admin/messaggi" },
    { icon: Crown, label: "Premium/Demo", path: "/admin/premium" },
    { icon: Settings, label: "Impostazioni", path: "/admin/impostazioni" },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <span className="font-bold tracking-wider text-sidebar-primary-foreground">STICKERS</span>
            <span className="text-xs text-sidebar-foreground/60 ml-2 uppercase tracking-widest">Admin</span>
          </div>
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <nav className="border-t border-sidebar-border py-2 px-3 space-y-0.5 bg-sidebar">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent w-full transition-colors mt-1"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium text-sm">Esci</span>
            </button>
          </nav>
        )}
      </div>

      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider text-sidebar-primary-foreground">STICKERS</h1>
          <p className="text-xs text-sidebar-foreground/70 uppercase tracking-widest mt-1">Pannello Admin</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground/80"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button 
            onClick={() => logout()}
            className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Esci</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-muted/20 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}
