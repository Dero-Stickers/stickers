import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { BookOpen, MapPin, Trophy, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserAlbums,
  useGetBestMatches,
} from "@workspace/api-client-react";

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

  const { data: myAlbums, isLoading: loadingAlbums } = useGetUserAlbums();
  const { data: bestMatches, isLoading: loadingMatches } = useGetBestMatches();

  const bestAlbum = myAlbums?.[0] ?? null;
  const bestMatch = bestMatches?.[0] ?? null;
  const nearbyMatch = bestMatches
    ?.filter(m => m.userId !== bestMatch?.userId)
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))[0] ?? null;

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-accent">S</span>TICKERS
              <span className="text-xs font-normal text-sidebar-foreground/60 ml-1 align-middle tracking-widest">matchbox</span>
            </h1>
            <p className="text-sidebar-foreground/70 text-sm mt-0.5">
              Ciao, <span className="font-semibold text-sidebar-foreground">{currentUser?.nickname}</span>
            </p>
          </div>
          <DemoStatusBadge status={currentUser?.demoStatus ?? null} expiresAt={currentUser?.demoExpiresAt} />
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4 pb-4">
        {/* Best album card */}
        {loadingAlbums && <Skeleton className="h-24 rounded-xl" />}
        {!loadingAlbums && bestAlbum && (
          <Link href={`/album/${bestAlbum.id}`}>
            <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">{bestAlbum.title}</span>
                  </div>
                  <span className="text-primary font-bold text-sm">{bestAlbum.completionPercent}%</span>
                </div>
                <Progress value={bestAlbum.completionPercent} className="h-2 mb-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{bestAlbum.owned} possedute</span>
                  <span>{bestAlbum.duplicates} doppie</span>
                  <span>{bestAlbum.missing} mancanti</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
        {!loadingAlbums && !bestAlbum && (
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center text-muted-foreground text-sm">
              Nessun album nella collezione — <Link href="/album" className="text-primary underline">aggiungine uno</Link>
            </CardContent>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-1">Album attivi</p>
              <div className="text-2xl font-bold text-foreground">
                {loadingAlbums ? <Skeleton className="h-7 w-8 inline-block" /> : (myAlbums?.length ?? 0)}
              </div>
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

          {loadingMatches && <Skeleton className="h-16 rounded-xl" />}

          {!loadingMatches && bestMatch && (
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

          {!loadingMatches && nearbyMatch && (
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

          {!loadingMatches && !bestMatch && (
            <Card className="shadow-sm bg-muted/50 border-0">
              <CardContent className="p-3 text-center text-xs text-muted-foreground">
                Nessun match disponibile — aggiungi più album e segnala le tue doppie!
              </CardContent>
            </Card>
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
              La tua area: <span className="font-medium text-foreground">{currentUser?.area ?? currentUser?.cap}</span>
              <span className="ml-1">— I match vengono cercati nelle zone vicine al tuo CAP</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
