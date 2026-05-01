import { mockUsers } from "@/mock/users";
import { mockAlbums } from "@/mock/albums";
import { mockChats } from "@/mock/chats";
import { Users, BookOpen, MessageSquare, Crown, Star, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = {
  totalUsers: mockUsers.filter(u => !u.isAdmin).length,
  publishedAlbums: mockAlbums.filter(a => a.isPublished).length,
  activeChats: mockChats.length,
  inDemo: mockUsers.filter(u => u.demoStatus === "demo_active").length,
  premium: mockUsers.filter(u => u.demoStatus === "premium" && !u.isAdmin).length,
  reports: 2,
};

const statCards = [
  { label: "Utenti totali", value: stats.totalUsers, icon: Users, color: "text-primary" },
  { label: "Album pubblicati", value: stats.publishedAlbums, icon: BookOpen, color: "text-primary" },
  { label: "Chat attive", value: stats.activeChats, icon: MessageSquare, color: "text-primary" },
  { label: "In demo", value: stats.inDemo, icon: Star, color: "text-amber-500" },
  { label: "Premium", value: stats.premium, icon: Crown, color: "text-amber-500" },
  { label: "Segnalazioni", value: stats.reports, icon: Flag, color: "text-destructive" },
];

const recentActivity = [
  { text: "Nuovo utente registrato: sofia_ro", time: "5 min fa" },
  { text: "Album 'UEFA Champions League 2024-25' pubblicato", time: "1 ora fa" },
  { text: "Demo attivata da mario75", time: "2 ore fa" },
  { text: "Segnalazione ricevuta in chat #2", time: "3 ore fa" },
  { text: "Nuovo utente registrato: giulia_stickers", time: "ieri" },
];

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Panoramica dell'applicazione</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(card => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attività recente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.map((item, i) => (
            <div key={i} className={`px-4 py-3 flex items-center justify-between ${i < recentActivity.length - 1 ? "border-b border-border/50" : ""}`}>
              <p className="text-sm text-foreground">{item.text}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-3">{item.time}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
