import { Link } from "wouter";
import { MapPin, Trophy, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MatchSummary } from "@workspace/api-client-react";
import { isDemoUserId } from "@/lib/demo-matches";

// Card riutilizzabile di un utente-match. Condivisa tra la lista match
// (Vicini/Migliori) e la ricerca per singola figurina, così l'aspetto resta
// identico in tutti i contesti e non si duplica il markup.
// I profili DEMO (userId negativo) mostrano un badge "PROVA" ben visibile.
export function MatchCard({ match }: { match: MatchSummary }) {
  const isDemo = isDemoUserId(match.userId);
  return (
    <Link href={`/match/${match.userId}`}>
      <Card className={`shadow-sm cursor-pointer transition-colors ${isDemo ? "border-accent/60 hover:border-accent" : "hover:border-primary"}`}>
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-foreground truncate">{match.nickname}</p>
              {isDemo && (
                <span className="shrink-0 rounded-full bg-accent/15 text-accent text-[10px] font-bold px-1.5 py-0.5 leading-none">
                  PROVA
                </span>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <MapPin className="h-3 w-3" />
                {match.area}
                {match.distanceKm != null && (
                  <span className="text-primary font-medium">{match.distanceKm.toFixed(1)} km</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-bold text-primary text-sm">{match.totalExchanges}</span>
              <span className="text-xs text-muted-foreground">scambi</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
            <Badge variant="outline" className="text-[11px] leading-none gap-1 border-0 px-0 bg-transparent font-normal">
              <Trophy className="h-2.5 w-2.5 shrink-0 text-yellow-600" />
              {match.albumsInCommon} album in comune
            </Badge>
            <Badge variant="outline" className="text-[11px] leading-none gap-1 border-0 px-0 bg-transparent font-normal">
              <Users className="h-2.5 w-2.5 shrink-0 text-chart-1" />
              {match.exchangesCompleted} scambi fatti
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
