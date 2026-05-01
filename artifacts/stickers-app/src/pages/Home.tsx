import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { mockAlbums } from "@/mock/albums";
import { mockMatches } from "@/mock/matches";
import { BookOpen, ArrowRight, MapPin, Trophy, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const MOCK_USER_STICKER_STATS: Record<number, { owned: number; duplicates: number }> = {
  1: { owned: 210, duplicates: 35 },
  2: { owned: 180, duplicates: 20 },
  3: { owned: 95, duplicates: 12 },
};

function DemoStatusBadge({ status, expiresAt }: { status: string | null; expiresAt?: string | null }) {
  if (status === "premium") return <Badge className="bg-amber-500 text-white text-xs font-bold">PREMIUM</Badge>;
  if (status === "demo_active") {
    const remaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3600000)) : 0;
    return <Badge className="bg-primary text-primary-foreground text-xs font-bold">DEMO ({remaining}h)</Badge>;
  }
  return <Badge variant="outline" className="text-xs">Free</Badge>;
}

export function Home() {
  const { currentUser } = useAuth();

  const myAlbums = mockAlbums.filter(a => [1, 2].includes(a.id));
  const bestAlbum = myAlbums[0];
  const bestStats = MOCK_USER_STICKER_STATS[bestAlbum?.id ?? 1];
  const completionPct = bestAlbum && bestStats
    ? Math.round(((bestStats.owned + bestStats.duplicates) / bestAlbum.totalStickers) * 100)
    : 0;

  const bestMatch = mockMatches[0];
  const nearbyMatch = [...mockMatches].sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))[0];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-accent">S</span>TICKERS
              <span className="text-xs font-normal text-sidebar-foreground/60 ml-1 align-middle tracking-widest">matchbox</span>
            </h1>
            <p className="text-sidebar-foreground/70 text-sm mt-0.5">Ciao, <span className="font-semibold text-sidebar-foreground">{currentUser?.nickname}</span></p>
          </div>
          <DemoStatusBadge status={currentUser?.demoStatus ?? null} expiresAt={currentUser?.demoExpiresAt} />
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-4">
        {/* Best album card */}
        {bestAlbum && (
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">{bestAlbum.title}</span>
                </div>
                <span className="text-primary font-bold text-sm">{completionPct}%</span>
              </div>
              <Progress value={completionPct} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{bestStats?.owned ?? 0} possedute</span>
                <span>{bestStats?.duplicates ?? 0} doppie</span>
                <span>{bestAlbum.totalStickers - (bestStats?.owned ?? 0) - (bestStats?.duplicates ?? 0)} mancanti</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Albums summary row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Album attivi</p>
              <p className="text-2xl font-bold text-foreground">{myAlbums.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Scambi completati</p>
              <p className="text-2xl font-bold text-foreground">{currentUser?.exchangesCompleted ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Match preview */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Match in evidenza</h2>

          {bestMatch && (
            <Link href={`/match/${bestMatch.userId}`}>
              <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                      <Trophy className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{bestMatch.nickname}</p>
                      <p className="text-xs text-muted-foreground">{bestMatch.totalExchanges} scambi possibili</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{bestMatch.albumsInCommon} album</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {nearbyMatch && nearbyMatch.userId !== bestMatch?.userId && (
            <Link href={`/match/${nearbyMatch.userId}`}>
              <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{nearbyMatch.nickname}</p>
                      <p className="text-xs text-muted-foreground">{nearbyMatch.distanceKm?.toFixed(1)} km — {nearbyMatch.area}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/album">
            <Button className="w-full h-12 bg-primary text-primary-foreground font-semibold gap-2">
              <BookOpen className="h-4 w-4" />
              I miei album
            </Button>
          </Link>
          <Link href="/match">
            <Button className="w-full h-12 bg-accent text-accent-foreground font-semibold gap-2">
              <Star className="h-4 w-4" />
              Trova match
            </Button>
          </Link>
        </div>

        {/* Area info */}
        <Card className="shadow-sm bg-muted/50 border-0">
          <CardContent className="p-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              La tua area: <span className="font-medium text-foreground">{currentUser?.area}</span>
              <span className="ml-1">— I match vengono cercati nelle zone vicine al tuo CAP</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
