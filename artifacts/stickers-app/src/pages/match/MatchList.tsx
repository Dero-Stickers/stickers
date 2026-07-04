import { useState, useEffect, useMemo } from "react";
import { useSearch } from "wouter";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetBestMatches,
  useGetNearbyMatches,
  getGetNearbyMatchesQueryKey,
} from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MatchCard } from "@/components/match/MatchCard";
import { SearchSticker } from "./SearchSticker";
import { useAuth } from "@/contexts/AuthContext";
import { buildDemoMatches, shouldShowDemos, countRealMatches } from "@/lib/demo-matches";
import { DemoBanner } from "@/components/match/DemoBanner";

const RADIUS_MIN = 1;
const RADIUS_MAX = 150;

type Tab = "nearby" | "best" | "search";

export function MatchList() {
  // Query string: ?tab=search apre la ricerca; ?album=..&sticker=.. la pre-compila.
  // Usata dai punti d'ingresso esterni (lente Home, pulsante sulla figurina).
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const initialTab = (params.get("tab") as Tab) || "nearby";
  const initialAlbumId = params.get("album") ? Number(params.get("album")) : undefined;
  const initialStickerId = params.get("sticker") ? Number(params.get("sticker")) : undefined;

  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab === "search" || initialTab === "best" ? initialTab : "nearby",
  );
  // Se la query string cambia MENTRE si è già su /match (es. lente Home o
  // navbar mentre la pagina è montata), riallinea la tab senza rimontare.
  useEffect(() => {
    setActiveTab(initialTab === "search" || initialTab === "best" ? initialTab : "nearby");
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  const [radiusKm, setRadiusKm] = useState(10);
  // Lo slider aggiorna subito il valore mostrato; la query parte "in ritardo"
  // (debounce 300ms) per non interrogare il backend a ogni km del trascinamento.
  const [radiusQuery, setRadiusQuery] = useState(10);
  useEffect(() => {
    const t = setTimeout(() => setRadiusQuery(radiusKm), 300);
    return () => clearTimeout(t);
  }, [radiusKm]);

  const { data: bestMatches, isLoading: loadingBest } = useGetBestMatches();
  const nearbyParams = { radius: radiusQuery };
  const { data: nearbyMatches, isLoading: loadingNearby } = useGetNearbyMatches(
    nearbyParams,
    { query: { queryKey: getGetNearbyMatchesQueryKey(nearbyParams), enabled: activeTab === "nearby" } }
  );

  // Profili-prova (onboarding): completano la vetrina fino a 2 vicini + 2
  // lontani SOLO finché l'utente non ha già abbastanza match reali per lato.
  // La rimozione è SINGOLA (dal dettaglio del profilo) e persiste in localStorage;
  // buildDemoMatches esclude da sé quelli già rimossi.
  const { currentUser } = useAuth();
  const demoMatches = useMemo(() => {
    if (!shouldShowDemos(currentUser)) return [];
    // Conta i match reali (validi) vicini/lontani sulla lista globale, così la
    // soglia non dipende dalla tab attiva. Raggio di riferimento = quello scelto.
    const real = countRealMatches(bestMatches, radiusQuery);
    return buildDemoMatches(currentUser, real);
  }, [currentUser, bestMatches, radiusQuery]);

  const isLoading = activeTab === "best" ? loadingBest : loadingNearby;
  // Memoizzato: lo spread+sort dei vicini viene rifatto solo al cambio di
  // tab/dati, non a ogni render (es. trascinamento slider raggio).
  const matches = useMemo(() => {
    const real =
      activeTab === "best"
        ? (bestMatches ?? [])
        : [...(nearbyMatches ?? [])].sort(
            (a, b) =>
              (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) ||
              a.nickname.localeCompare(b.nickname),
          );
    // In "Vicini" mostro solo i demo che cadono nel raggio corrente; in
    // "Migliori" li mostro tutti e 4. I demo restano sempre in cima.
    const demos =
      activeTab === "nearby"
        ? demoMatches.filter((d) => (d.distanceKm ?? Infinity) <= radiusQuery)
        : demoMatches;
    return [...demos, ...real];
  }, [activeTab, bestMatches, nearbyMatches, demoMatches, radiusQuery]);

  const tabClass = (t: Tab) =>
    `flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-3 text-center shrink-0">
        <h1 className="text-base font-bold text-foreground">Match</h1>
        <p className="text-muted-foreground text-xs">Trova collezionisti per scambiare</p>
      </div>

      <div className="px-4 pt-4 shrink-0">
        <div className="flex rounded-lg bg-muted p-1">
          <button className={tabClass("nearby")} onClick={() => setActiveTab("nearby")}>
            Vicini a te
          </button>
          <button className={tabClass("best")} onClick={() => setActiveTab("best")}>
            Migliori match
          </button>
          <button className={tabClass("search")} onClick={() => setActiveTab("search")}>
            Cerca figurina
          </button>
        </div>
      </div>

      {activeTab === "nearby" && (
        <div className="px-4 pt-4 shrink-0">
          <div className="px-3 py-2.5 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Raggio di ricerca</span>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 font-bold">{radiusKm} km</Badge>
            </div>
            <input
              type="range"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step={1}
              value={radiusKm}
              onChange={e => setRadiusKm(Number(e.target.value))}
              aria-label="Raggio di ricerca in km"
              className="w-full h-5 cursor-pointer accent-primary touch-none"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{RADIUS_MIN} km</span>
              <span>{RADIUS_MAX} km</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 min-h-0">
        {activeTab === "search" ? (
          <SearchSticker initialAlbumId={initialAlbumId} initialStickerId={initialStickerId} />
        ) : (
          <>
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            )}

            {!isLoading && demoMatches.length > 0 && <DemoBanner />}

            {!isLoading && matches.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun match trovato</p>
                {activeTab === "nearby" && <p className="text-sm mt-1">Prova ad aumentare il raggio di ricerca</p>}
                <p className="text-sm mt-1">Aggiungi più album e segna le tue doppie per trovare match</p>
              </div>
            )}

            <div className="grid gap-1.5 md:grid-cols-2 items-start">
              {matches.map(match => (
                <MatchCard key={match.userId} match={match} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
