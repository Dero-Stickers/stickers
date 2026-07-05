import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import { Zap, ArrowRight, MapPin, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserAlbums,
  useGetBestMatches,
} from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { buildDemoMatches, countRealMatches, isDemoUserId, NEAR_THRESHOLD_KM } from "@/lib/demo-matches";

// "Vicini a me" nella Home usa la stessa soglia di vicinanza dei demo: chi è
// entro questa distanza è "vicino" (demo e reali). I profili-prova lontani
// (151 km) restano quindi solo nella modalità "Migliori".
const HOME_RADIUS_KM = NEAR_THRESHOLD_KM;

export function Home() {
  const { currentUser } = useAuth();
  // Switch hero: "best" = migliori in generale · "nearby" = migliori vicino a me
  const [heroMode, setHeroMode] = useState<"best" | "nearby">("best");

  const { data: myAlbums, isLoading: loadingAlbums } = useGetUserAlbums();
  const { data: bestMatches, isLoading: loadingMatches } = useGetBestMatches();

  // 1 · Sintesi collezione — aggregato su TUTTI gli album
  const albums = myAlbums ?? [];
  // Aggregati/derivati memoizzati: ricalcolati solo al cambio dei dati, non a
  // ogni render (es. switch hero, apertura chat…).
  const agg = useMemo(() => albums.reduce(
    (a, al) => ({
      owned: a.owned + al.owned,
      duplicates: a.duplicates + al.duplicates,
      missing: a.missing + al.missing,
      slots: a.slots + al.totalStickers,
    }),
    { owned: 0, duplicates: 0, missing: 0, slots: 0 },
  ), [albums]);
  const overallPercent = agg.slots > 0 ? Math.round((agg.owned / agg.slots) * 100) : 0;

  // 2 · Match — l'eroe della pagina. Ai match reali si aggiungono i profili-PROVA
  // (onboarding) solo finché servono a completare la vetrina (vedi demo-matches).
  const realMatches = bestMatches ?? [];
  const demoMatches = useMemo(
    // Aspetta il caricamento dei match reali: calcolarli mentre loadingMatches
    // è true (conteggio a 0) farebbe apparire demo in eccesso che poi spariscono.
    () => (loadingMatches ? [] : buildDemoMatches(currentUser, countRealMatches(realMatches, HOME_RADIUS_KM))),
    [currentUser, realMatches, loadingMatches],
  );
  const matches = useMemo(() => [...demoMatches, ...realMatches], [demoMatches, realMatches]);
  // Pool corrente in base al toggle: "Vicini a me" mostra SOLO chi è entro il
  // raggio (demo e reali); i lontani (profili-prova a 151 km) restano in
  // "Migliori". Un solo filtro condiviso da lista e contatori (niente divergenze).
  const currentPool = useMemo(
    () =>
      heroMode === "nearby"
        ? matches.filter((m) => (m.distanceKm ?? Infinity) <= HOME_RADIUS_KM)
        : matches,
    [matches, heroMode],
  );
  const topMatches = useMemo(() =>
    [...currentPool]
      .sort((a, b) =>
        heroMode === "best"
          ? b.totalExchanges - a.totalExchanges
          : (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      )
      .slice(0, 4),
    [currentPool, heroMode]);
  // Contatore riferito ESATTAMENTE ai match mostrati (topMatches, max 4): il box
  // ne mostra al più 4, quindi "N scambi · N utenti" deve combaciare con le card
  // visibili (prima usava l'intero pool → "5 utenti" con 4 righe = incoerente).
  const totalExchanges = useMemo(() => topMatches.reduce((s, m) => s + m.totalExchanges, 0), [topMatches]);
  // Se ciò che si vede è composto SOLO da profili-prova, il contatore lo dichiara
  // ("scambi di prova") per non far credere che siano scambi reali già disponibili.
  const onlyDemos = topMatches.length > 0 && topMatches.every((m) => isDemoUserId(m.userId));

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-3 flex items-center justify-center gap-2 shrink-0">
        <p className="text-sm text-muted-foreground">
          Ciao, <span className="font-semibold text-foreground">{currentUser?.nickname}</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-3 pb-4 min-h-0">
        {/* 1 · Sintesi collezione — box SEMPRE mostrato (anche a 0 album: gli
            aggregati sono già 0 su collezione vuota). Senza album, sotto il
            titolo, un invito interattivo ad aggiungere il primo album. */}
        {loadingAlbums && <Skeleton className="h-28 rounded-xl" />}
        {!loadingAlbums && (
          <Card className="shadow-sm">
            <CardContent className="p-4">
              {/* Titolo centrato (senza icona), percentuale ancorata a destra */}
              <div className="relative flex items-center justify-center mb-3">
                <span className="text-sm font-semibold text-foreground">La tua collezione</span>
                <span className="absolute right-0 text-primary font-bold text-lg leading-none">{overallPercent}%</span>
              </div>
              {albums.length === 0 && (
                <p className="text-center text-xs text-muted-foreground mb-3">
                  Nessun album presente
                </p>
              )}
              <Progress value={overallPercent} className="h-2 mb-3" />
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary leading-none">{albums.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">album</p>
                </div>
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

        {/* 2 · Match — hero (i nuovi messaggi si vedono SOLO in /messaggi:
            il badge rosso in navbar è già il segnale, niente doppioni in Home) */}
        {loadingMatches && <Skeleton className="h-48 rounded-2xl" />}
        {!loadingMatches && topMatches.length > 0 && (
          <Card className="border-0 shadow-md overflow-hidden bg-linear-to-br from-primary to-chart-1 text-primary-foreground">
            <CardContent className="p-4 space-y-2.5">
              <div className="relative flex items-center justify-center gap-2">
                <Link href="/match?tab=search">
                  <button
                    type="button"
                    aria-label="Cerca una figurina"
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-1.5 text-white/90 transition-colors hover:bg-white/25"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </Link>
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
                  <span className="font-bold text-white">{totalExchanges}</span> scambi{onlyDemos ? " di prova" : ""} · <span className="font-bold text-white">{topMatches.length}</span> {onlyDemos ? "profili prova" : `utenti${heroMode === "best" ? "" : " vicini"}`}
                </p>
              </div>

              <div className="space-y-1">
                {topMatches.map(m => (
                  <Link key={m.userId} href={`/match/${m.userId}`} className="block">
                    <div className="flex h-12 items-center justify-between gap-2 bg-white/15 rounded-lg px-3 py-1.5 cursor-pointer transition-transform active:scale-[0.99] hover:bg-white/25">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                          <span className="truncate">{m.nickname}</span>
                          {isDemoUserId(m.userId) && (
                            <span className="shrink-0 rounded-full bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 leading-none">
                              PROVA
                            </span>
                          )}
                        </p>
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
                {/* Slot mancanti: STESSA altezza fissa (h-12) delle card
                    piene → il box blu resta SEMPRE identico, non si accorcia con
                    meno match. Card piene neutre (NON tratteggiate). Il testo
                    "Nessun altro match disponibile" compare solo nel primo slot. */}
                {Array.from({ length: Math.max(0, 4 - topMatches.length) }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="flex h-12 items-center justify-center bg-white/10 rounded-lg px-3 py-1.5"
                    aria-hidden="true"
                  >
                    {i === 0 && (
                      <span className="text-xs text-white/60">Nessun altro match disponibile</span>
                    )}
                  </div>
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
