import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { mockMatchDetails } from "@/mock/matches";
import { mockChats } from "@/mock/chats";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, MapPin, MessageSquare, X, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MatchDetail() {
  const { userId } = useParams<{ userId: string }>();
  const matchUserId = parseInt(userId, 10);
  const [, setLocation] = useLocation();
  const { currentUser, demoStatus } = useAuth();

  const detail = mockMatchDetails[matchUserId];
  const [showPaywall, setShowPaywall] = useState(false);
  const [demoActivated, setDemoActivated] = useState(false);

  if (!detail) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <p className="text-muted-foreground">Match non trovato</p>
      </div>
    );
  }

  const canChat = demoStatus === "premium" || demoStatus === "demo_active" || demoActivated;

  const handleOpenChat = () => {
    if (canChat) {
      const chat = mockChats.find(c => c.participants.includes(matchUserId));
      if (chat) {
        setLocation(`/chat/${chat.id}`);
      } else {
        setLocation(`/chat/new-${matchUserId}`);
      }
    } else {
      setShowPaywall(true);
    }
  };

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-6">
        <button className="flex items-center gap-1.5 text-sidebar-foreground/70 mb-3 text-sm" onClick={() => setLocation("/match")}>
          <ArrowLeft className="h-4 w-4" />
          Match
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-bold text-accent text-lg uppercase">
            {detail.nickname.slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{detail.nickname}</h1>
            <p className="text-sidebar-foreground/70 text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {detail.area}
              {detail.distanceKm != null && <span className="ml-1">{detail.distanceKm.toFixed(1)} km</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 text-center bg-white/10 rounded-xl py-3">
          <p className="text-3xl font-black text-accent">{detail.totalExchanges}</p>
          <p className="text-sm text-sidebar-foreground/70">scambi possibili</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {detail.albums.map(album => (
          <Card key={album.albumId} className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">{album.albumTitle}</CardTitle>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">{album.exchangeCount} scambi</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Tu dai</p>
                  <div className="space-y-1">
                    {album.youGive.length === 0 && <p className="text-xs text-muted-foreground italic">Nessuna</p>}
                    {album.youGive.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-xs bg-green-50 border border-green-100 rounded-md px-2 py-1">
                        <span className="font-bold text-green-700 w-6 flex-shrink-0">#{s.number}</span>
                        <span className="truncate text-green-800">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Tu ricevi</p>
                  <div className="space-y-1">
                    {album.youReceive.length === 0 && <p className="text-xs text-muted-foreground italic">Nessuna</p>}
                    {album.youReceive.map(s => (
                      <div key={s.id} className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-md px-2 py-1">
                        <span className="font-bold text-blue-700 w-6 flex-shrink-0">#{s.number}</span>
                        <span className="truncate text-blue-800">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 pt-3 bg-background/95 backdrop-blur border-t border-border">
        <Button className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold gap-2 text-base" onClick={handleOpenChat}>
          <MessageSquare className="h-5 w-5" />
          Apri chat con {detail.nickname}
        </Button>
      </div>

      {/* Paywall modal */}
      <Dialog open={showPaywall} onOpenChange={setShowPaywall}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Funzione Premium</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {demoStatus === "free" ? (
              <>
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <Star className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Prova premium gratis per 24 ore</p>
                  <p className="text-sm text-muted-foreground mt-1">Attiva la demo e scrivi subito a {detail.nickname}</p>
                </div>
                <Button
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                  onClick={() => { setDemoActivated(true); setShowPaywall(false); }}
                >
                  Attiva demo gratuita
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  La tua demo è scaduta. Passa a Premium per continuare a scambiare.
                </p>
                <div className="space-y-2">
                  <Button disabled className="w-full" variant="outline">Mensile — €2,99/mese</Button>
                  <Button disabled className="w-full" variant="outline">Annuale — €19,99/anno</Button>
                  <Button disabled className="w-full" variant="outline">Una tantum — €34,99</Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Pagamenti in arrivo. Contatta <a href="mailto:dero975@gmail.com" className="text-primary underline">dero975@gmail.com</a>
                </p>
              </>
            )}
            <Button variant="ghost" className="w-full" onClick={() => setShowPaywall(false)}>
              <X className="h-4 w-4 mr-2" />
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
