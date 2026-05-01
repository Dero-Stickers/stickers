import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { mockAlbums } from "@/mock/albums";
import { mockStickers } from "@/mock/stickers";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type StickerState = "mancante" | "posseduta" | "doppia";

const NEXT_STATE: Record<StickerState, StickerState> = {
  mancante: "posseduta",
  posseduta: "doppia",
  doppia: "mancante",
};

const INITIAL_STATES: Record<number, StickerState> = {
  1: "posseduta", 2: "doppia", 3: "mancante", 4: "posseduta", 5: "doppia",
  6: "mancante", 7: "posseduta", 8: "mancante", 9: "doppia", 10: "mancante",
  11: "posseduta", 12: "mancante", 13: "doppia", 14: "mancante", 15: "posseduta",
  16: "mancante", 17: "doppia", 18: "mancante", 19: "posseduta", 20: "mancante",
  21: "posseduta", 22: "mancante", 23: "doppia", 24: "mancante", 25: "posseduta",
  26: "mancante", 27: "posseduta", 28: "doppia", 29: "mancante", 30: "posseduta",
};

type FilterType = "tutte" | "mancanti" | "possedute" | "doppie";

export function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const albumId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const album = mockAlbums.find(a => a.id === albumId);
  const stickers = mockStickers[albumId] ?? [];

  const [states, setStates] = useState<Record<number, StickerState>>(() => {
    const initial: Record<number, StickerState> = {};
    stickers.forEach(s => { initial[s.id] = INITIAL_STATES[s.id] ?? "mancante"; });
    return initial;
  });

  const [filter, setFilter] = useState<FilterType>("tutte");
  const [selectedSticker, setSelectedSticker] = useState<(typeof stickers)[0] | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!album) {
    return (
      <div className="flex items-center justify-center min-h-full p-4">
        <p className="text-muted-foreground">Album non trovato</p>
      </div>
    );
  }

  const tapSticker = (stickerId: number) => {
    setStates(prev => ({ ...prev, [stickerId]: NEXT_STATE[prev[stickerId] ?? "mancante"] }));
  };

  const handlePointerDown = (s: typeof stickers[0]) => {
    longPressTimer.current = setTimeout(() => setSelectedSticker(s), 500);
  };
  const handlePointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const owned = Object.values(states).filter(s => s === "posseduta").length;
  const duplicates = Object.values(states).filter(s => s === "doppia").length;
  const missing = stickers.length - owned - duplicates;
  const pct = stickers.length > 0 ? Math.round(((owned + duplicates) / stickers.length) * 100) : 0;

  const filteredStickers = stickers.filter(s => {
    const st = states[s.id] ?? "mancante";
    if (filter === "tutte") return true;
    if (filter === "mancanti") return st === "mancante";
    if (filter === "possedute") return st === "posseduta";
    if (filter === "doppie") return st === "doppia";
    return true;
  });

  const stateColors: Record<StickerState, string> = {
    mancante: "bg-gray-100 text-gray-400 border border-gray-200",
    posseduta: "bg-green-100 text-green-700 border border-green-200",
    doppia: "bg-red-100 text-red-600 border border-red-200",
  };

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: "tutte", label: "Tutte", count: stickers.length },
    { key: "mancanti", label: "Mancanti", count: missing },
    { key: "possedute", label: "Possedute", count: owned },
    { key: "doppie", label: "Doppie", count: duplicates },
  ];

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-4">
        <button className="flex items-center gap-1.5 text-sidebar-foreground/70 mb-3 text-sm" onClick={() => setLocation("/album")}>
          <ArrowLeft className="h-4 w-4" />
          Album
        </button>
        <h1 className="text-lg font-bold leading-tight mb-3">{album.title}</h1>
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{stickers.length}</p>
            <p className="text-xs text-sidebar-foreground/60">Totale</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{owned}</p>
            <p className="text-xs text-sidebar-foreground/60">Possedute</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{duplicates}</p>
            <p className="text-xs text-sidebar-foreground/60">Doppie</p>
          </div>
          <div>
            <p className="text-xl font-bold text-sidebar-foreground/60">{missing}</p>
            <p className="text-xs text-sidebar-foreground/60">Mancanti</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-sidebar-border/40 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-accent">{pct}%</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === opt.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
          >
            {opt.label} <span className="opacity-70">({opt.count})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="px-3 pb-6">
        {filteredStickers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Nessuna figurina in questa categoria</p>
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
          {filteredStickers.map(s => {
            const st = states[s.id] ?? "mancante";
            return (
              <button
                key={s.id}
                className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold select-none transition-transform active:scale-95 ${stateColors[st]}`}
                onClick={() => tapSticker(s.id)}
                onPointerDown={() => handlePointerDown(s)}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              >
                {s.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticker detail modal */}
      <Dialog open={!!selectedSticker} onOpenChange={() => setSelectedSticker(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Figurina #{selectedSticker?.number}</DialogTitle>
          </DialogHeader>
          {selectedSticker && (
            <div className="space-y-3">
              <div className={`h-24 rounded-lg flex items-center justify-center text-3xl font-black ${stateColors[states[selectedSticker.id] ?? "mancante"]}`}>
                {selectedSticker.number}
              </div>
              <p className="font-semibold text-foreground text-lg">{selectedSticker.name}</p>
              {selectedSticker.description && <p className="text-sm text-muted-foreground">{selectedSticker.description}</p>}
              <div className="flex gap-2 pt-2">
                {(["posseduta", "doppia", "mancante"] as StickerState[]).map(st => (
                  <Button
                    key={st}
                    size="sm"
                    variant={(states[selectedSticker.id] ?? "mancante") === st ? "default" : "outline"}
                    className={`flex-1 capitalize text-xs ${(states[selectedSticker.id] ?? "mancante") === st ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => { setStates(p => ({ ...p, [selectedSticker.id]: st })); setSelectedSticker(null); }}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove album */}
      <div className="px-4 pb-8">
        <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowRemoveDialog(true)}>
          Rimuovi album dalla collezione
        </Button>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i progressi verranno eliminati. L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { toast({ title: "Album rimosso" }); setLocation("/album"); }}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
