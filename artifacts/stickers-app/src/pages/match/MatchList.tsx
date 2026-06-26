import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MapPin, Trophy, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetBestMatches,
  useGetNearbyMatches,
  getGetNearbyMatchesQueryKey,
} from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";

const RADIUS_MIN = 1;
const RADIUS_MAX = 100;

export function MatchList() {
  const [activeTab, setActiveTab] = useState<"best" | "nearby">("best");
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

  const isLoading = activeTab === "best" ? loadingBest : loadingNearby;
  const matches = activeTab === "best" ? (bestMatches ?? []) : (nearbyMatches ?? []);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <AppHeader />
      <div className="px-4 pt-3 text-center shrink-0">
        <h1 className="text-base font-bold text-foreground">Match</h1>
        <p className="text-muted-foreground text-xs">Trova collezionisti per scambiare</p>
      </div>

      <div className="px-4 pt-4 shrink-0">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "best" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("best")}
          >
            Migliori match
          </button>
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "nearby" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("nearby")}
          >
            Vicini a te
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 min-h-0">
        {activeTab === "nearby" && (
          <div className="mb-4 p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
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
              className="w-full h-6 cursor-pointer accent-primary touch-none"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>{RADIUS_MIN} km</span>
              <span>{RADIUS_MAX} km</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        )}

        {!isLoading && matches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun match trovato</p>
            {activeTab === "nearby" && <p className="text-sm mt-1">Prova ad aumentare il raggio di ricerca</p>}
            <p className="text-sm mt-1">Aggiungi più album e segna le tue doppie per trovare match</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 items-start">
          {matches.map(match => (
            <Link key={match.userId} href={`/match/${match.userId}`}>
              <Card className="shadow-sm cursor-pointer hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm uppercase flex-shrink-0">
                        {match.nickname.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{match.nickname}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {match.area}
                          {match.distanceKm != null && (
                            <span className="ml-1 text-primary font-medium">{match.distanceKm.toFixed(1)} km</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold text-primary text-sm">{match.totalExchanges}</p>
                        <p className="text-xs text-muted-foreground">scambi</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Trophy className="h-3 w-3" />
                      {match.albumsInCommon} album in comune
                    </Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      <Users className="h-3 w-3" />
                      {match.exchangesCompleted} scambi fatti
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
