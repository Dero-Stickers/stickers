import { Users, BookOpen, MessageSquare, Crown, Star, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminStats } from "@workspace/api-client-react";

export function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    { label: "Utenti totali", value: stats?.totalUsers, icon: Users, color: "text-primary" },
    { label: "Album totali", value: stats?.totalAlbums, icon: BookOpen, color: "text-primary" },
    { label: "Chat attive", value: stats?.activeChats, icon: MessageSquare, color: "text-primary" },
    { label: "In demo", value: stats?.demoUsers, icon: Star, color: "text-amber-500" },
    { label: "Premium", value: stats?.premiumUsers, icon: Crown, color: "text-amber-500" },
    { label: "Segnalazioni", value: stats?.pendingReports, icon: Flag, color: "text-destructive" },
  ];

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
              {isLoading
                ? <Skeleton className="h-9 w-12" />
                : <p className={`text-3xl font-bold ${card.color}`}>{card.value ?? 0}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Info sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {[
            { label: "Messaggi totali", value: stats?.totalMessages },
            { label: "Utenti bloccati", value: stats?.blockedUsers },
          ].map((item, i, arr) => (
            <div key={item.label} className={`px-4 py-3 flex items-center justify-between ${i < arr.length - 1 ? "border-b border-border/50" : ""}`}>
              <p className="text-sm text-foreground">{item.label}</p>
              {isLoading
                ? <Skeleton className="h-5 w-8" />
                : <span className="text-sm font-semibold text-foreground">{item.value ?? 0}</span>
              }
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
