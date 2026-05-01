import { useState } from "react";
import { Link } from "wouter";
import { mockMatches } from "@/mock/matches";
import { MapPin, Trophy, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

export function MatchList() {
  const [activeTab, setActiveTab] = useState<"best" | "nearby">("best");
  const [radiusKm, setRadiusKm] = useState(10);

  const bestMatches = [...mockMatches].sort((a, b) => b.totalExchanges - a.totalExchanges);
  const nearbyMatches = [...mockMatches]
    .filter(m => (m.distanceKm ?? 99) <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  const matches = activeTab === "best" ? bestMatches : nearbyMatches;

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold">Match</h1>
        <p className="text-sidebar-foreground/70 text-sm mt-0.5">Trova collezionisti per scambiare</p>
      </div>

      <div className="px-4 pt-4 pb-4">
        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-4">
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

        {/* Radius slider for nearby tab */}
        {activeTab === "nearby" && (
          <div className="mb-4 p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Raggio di ricerca</span>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 font-bold">{radiusKm} km</Badge>
            </div>
            <Slider
              min={5}
              max={100}
              step={5}
              value={[radiusKm]}
              onValueChange={([v]) => setRadiusKm(v)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>5 km</span>
              <span>100 km</span>
            </div>
          </div>
        )}

        {/* Match cards */}
        {matches.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun match trovato</p>
            {activeTab === "nearby" && (
              <p className="text-sm mt-1">Prova ad aumentare il raggio di ricerca</p>
            )}
            <p className="text-sm mt-1">Aggiungi più album e segna le tue doppie per trovare match</p>
          </div>
        )}

        <div className="space-y-3">
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
