import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  useGetUserAlbumStickers,
  useUpdateUserStickerState,
  useRemoveAlbumFromUser,
  useGetUserAlbums,
  getGetUserAlbumsQueryKey,
  getGetUserAlbumStickersQueryKey,
} from "@workspace/api-client-react";
import type { UserSticker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type StickerState = "mancante" | "posseduta" | "doppia";
type FilterType = "tutte" | "mancanti" | "possedute" | "doppie";

const NEXT_STATE: Record<StickerState, StickerState> = {
  mancante: "posseduta",
  posseduta: "doppia",
  doppia: "mancante",
};

const stateColors: Record<StickerState, string> = {
  mancante: "bg-gray-100 text-gray-400 border border-gray-200",
  posseduta: "bg-green-100 text-green-700 border border-green-200",
  doppia: "bg-red-100 text-red-600 border border-red-200",
};

export function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const albumId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterType>("tutte");
  const [selectedSticker, setSelectedSticker] = useState<UserSticker | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: userAlbums } = useGetUserAlbums();
  const albumInfo = userAlbums?.find(a => a.id === albumId);

  const { data: stickers, isLoading } = useGetUserAlbumStickers(albumId);

  const updateState = useUpdateUserStickerState({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumStickersQueryKey(albumId) });
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
      },
    },
  });

  const removeAlbum = useRemoveAlbumFromUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        toast({ title: "Album rimosso" });
        setLocation("/album");
      },
    },
  });

  const tapSticker = (s: UserSticker) => {
    const nextState = NEXT_STATE[s.state as StickerState ?? "mancante"];
    updateState.mutate({ albumId, stickerId: s.stickerId, data: { state: nextState } });
  };

  const handlePointerDown = (s: UserSticker) => {
    longPressTimer.current = setTimeout(() => setSelectedSticker(s), 500);
  };
  const handlePointerUp = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const owned = stickers?.filter(s => s.state === "posseduta").length ?? 0;
  const duplicates = stickers?.filter(s => s.state === "doppia").length ?? 0;
  const total = stickers?.length ?? 0;
  const missing = Math.max(0, total - owned - duplicates);
  const pct = total > 0 ? Math.round(((owned + duplicates) / total) * 100) : 0;

  const filteredStickers = stickers?.filter(s => {
    if (filter === "tutte") return true;
    if (filter === "mancanti") return s.state === "mancante";
    if (filter === "possedute") return s.state === "posseduta";
    if (filter === "doppie") return s.state === "doppia";
    return true;
  }) ?? [];

  const filterOptions: { key: FilterType; label: string; count: number }[] = [
    { key: "tutte", label: "Tutte", count: total },
    { key: "mancanti", label: "Mancanti", count: missing },
    { key: "possedute", label: "Possedute", count: owned },
    { key: "doppie", label: "Doppie", count: duplicates },
  ];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 21 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      </div>
    );
  }

  const albumTitle = albumInfo?.title ?? `Album #${albumId}`;

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-4">
        <button className="flex items-center gap-1.5 text-sidebar-foreground/85 mb-3 text-sm" onClick={() => setLocation("/album")}>
          <ArrowLeft className="h-4 w-4" />
          Album
        </button>
        <h1 className="text-lg font-bold leading-tight mb-3">{albumTitle}</h1>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold">{total}</p>
            <p className="text-xs text-sidebar-foreground/85">Totale</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-400">{owned}</p>
            <p className="text-xs text-sidebar-foreground/85">Possedute</p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{duplicates}</p>
            <p className="text-xs text-sidebar-foreground/85">Doppie</p>
          </div>
          <div>
            <p className="text-xl font-bold text-sidebar-foreground/85">{missing}</p>
            <p className="text-xs text-sidebar-foreground/85">Mancanti</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-sidebar-border/40 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-accent">{pct}%</span>
        </div>
      </div>

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

      <div className="px-3 pb-6">
        {filteredStickers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Nessuna figurina in questa categoria</p>
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
          {filteredStickers.map(s => {
            const st = (s.state ?? "mancante") as StickerState;
            return (
              <button
                key={s.stickerId}
                className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold select-none transition-transform active:scale-95 ${stateColors[st]}`}
                onClick={() => tapSticker(s)}
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

      <Dialog open={!!selectedSticker} onOpenChange={() => setSelectedSticker(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Figurina #{selectedSticker?.number}</DialogTitle>
          </DialogHeader>
          {selectedSticker && (
            <div className="space-y-3">
              <div className={`h-24 rounded-lg flex items-center justify-center text-3xl font-black ${stateColors[(selectedSticker.state ?? "mancante") as StickerState]}`}>
                {selectedSticker.number}
              </div>
              <p className="font-semibold text-foreground text-lg">{selectedSticker.name}</p>
              {selectedSticker.description && <p className="text-sm text-muted-foreground">{selectedSticker.description}</p>}
              <div className="flex gap-2 pt-2">
                {(["posseduta", "doppia", "mancante"] as StickerState[]).map(st => (
                  <Button
                    key={st}
                    size="sm"
                    variant={selectedSticker.state === st ? "default" : "outline"}
                    className={`flex-1 capitalize text-xs ${selectedSticker.state === st ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => {
                      updateState.mutate({ albumId, stickerId: selectedSticker.stickerId, data: { state: st } });
                      setSelectedSticker(null);
                    }}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="px-4 pb-8">
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setShowRemoveDialog(true)}
        >
          Rimuovi album dalla collezione
        </Button>
      </div>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i progressi verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeAlbum.mutate({ albumId })}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
