import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Zap, ArrowRight, MapPin, MessageCircle, Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserAlbums,
  useGetBestMatches,
  useListChats,
} from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";

export function Home() {
  const { currentUser } = useAuth();
  // Switch hero: "best" = migliori in generale · "nearby" = migliori vicino a me
  const [heroMode, setHeroMode] = useState<"best" | "nearby">("best");

  const { data: myAlbums, isLoading: loadingAlbums } = useGetUserAlbums();
  const { data: bestMatches, isLoading: loadingMatches } = useGetBestMatches();
  const { data: chats } = useListChats();

  // 1 · Sintesi collezione — aggregato su TUTTI gli album
  const albums = myAlbums ?? [];
  const agg = albums.reduce(
    (a, al) => ({
      owned: a.owned + al.owned,
      duplicates: a.duplicates + al.duplicates,
      missing: a.missing + al.missing,
      slots: a.slots + al.totalStickers,
    }),
    { owned: 0, duplicates: 0, missing: 0, slots: 0 },
  );
  const overallPercent = agg.slots > 0 ? Math.round((agg.owned / agg.slots) * 100) : 0;

  // 2 · Azioni richieste — chat con messaggi non letti
  const unreadChats = (chats ?? []).filter(c => c.unreadCount > 0);

  // 3 · Match — l'eroe della pagina
  const matches = bestMatches ?? [];
  const topMatches = [...matches]
    .sort((a, b) =>
      heroMode === "best"
        ? b.totalExchanges - a.totalExchanges
        : (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    )
    .slice(0, 3);
  const totalExchanges = matches.reduce((s, m) => s + m.totalExchanges, 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <AppHeader />
      <div className="px-4 pt-3 flex items-center justify-center gap-2 shrink-0">
        <p className="text-sm text-muted-foreground">
          Ciao, <span className="font-semibold text-foreground">{currentUser?.nickname}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 pb-4 min-h-0">
        {/* 1 · Sintesi collezione */}
        {loadingAlbums && <Skeleton className="h-28 rounded-xl" />}
        {!loadingAlbums && albums.length > 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">La tua collezione</span>
                  <span className="text-xs text-muted-foreground">· {albums.length} album</span>
                </div>
                <span className="text-primary font-bold text-lg leading-none">{overallPercent}%</span>
              </div>
              <Progress value={overallPercent} className="h-2 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-chart-3 leading-none">{agg.owned}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">possedute</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-destructive leading-none">{agg.duplicates}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">doppie</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-accent leading-none">{agg.missing}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">mancanti</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {!loadingAlbums && albums.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center text-muted-foreground text-sm">
              Nessun album nella collezione — <Link href="/album" className="text-primary font-medium underline">aggiungine uno</Link>
            </CardContent>
          </Card>
        )}

        {/* 2 · Azioni richieste */}
        {unreadChats.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ti aspettano</h2>
            {unreadChats.slice(0, 3).map(chat => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors">
                  <CardContent className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-4 w-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{chat.otherUserNickname}</p>
                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage ?? "Nuovo messaggio"}</p>
                      </div>
                    </div>
                    <Badge className="bg-accent text-accent-foreground border-0 text-xs font-bold shrink-0">{chat.unreadCount}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* 3 · Match — hero */}
        {loadingMatches && <Skeleton className="h-48 rounded-2xl" />}
        {!loadingMatches && topMatches.length > 0 && (
          <Card className="border-0 shadow-md overflow-hidden bg-linear-to-br from-primary to-chart-1 text-primary-foreground">
            <CardContent className="p-4 space-y-2.5">
              <div className="relative flex items-center justify-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/90">Migliori match</span>
                <div className="absolute right-0 flex items-center gap-0.5 rounded-full bg-white/15 p-0.5">
                  <button
                    type="button"
                    onClick={() => setHeroMode("best")}
                    aria-label="Migliori match"
                    aria-pressed={heroMode === "best"}
                    className={`rounded-full p-1.5 transition-colors ${heroMode === "best" ? "bg-white text-accent" : "text-white/80"}`}
                  >
                    <Zap className={`h-3.5 w-3.5 ${heroMode === "best" ? "fill-accent" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroMode("nearby")}
                    aria-label="Migliori vicino a me"
                    aria-pressed={heroMode === "nearby"}
                    className={`rounded-full p-1.5 transition-colors ${heroMode === "nearby" ? "bg-white text-primary" : "text-white/80"}`}
                  >
                    {heroMode === "nearby" ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
                      </svg>
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm leading-tight text-white/90">
                  <span className="font-bold text-white">{totalExchanges}</span> scambi · <span className="font-bold text-white">{matches.length}</span> utenti{heroMode === "best" ? "" : " vicini"}
                </p>
              </div>

              <div className="space-y-1">
                {topMatches.map(m => (
                  <Link key={m.userId} href={`/match/${m.userId}`} className="block">
                    <div className="flex items-center justify-between gap-2 bg-white/15 rounded-lg px-3 py-1.5 cursor-pointer transition-transform active:scale-[0.99] hover:bg-white/25">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{m.nickname}</p>
                        <p className="text-xs text-white/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {m.distanceKm != null ? `${m.distanceKm.toFixed(1)} km` : m.area}
                          {m.distanceKm != null && m.area ? ` · ${m.area}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold shrink-0">{m.totalExchanges} scambi</span>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/match">
                <div className="flex items-center justify-center gap-1.5 bg-white text-primary font-semibold text-sm rounded-lg py-2 cursor-pointer transition-transform active:scale-[0.99]">
                  Trova match
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </CardContent>
          </Card>
        )}
        {!loadingMatches && topMatches.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-5 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold text-foreground">Nessun match ancora</p>
              <p className="text-xs text-muted-foreground">Aggiungi album e segna le tue doppie per trovare collezionisti con cui scambiare</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
