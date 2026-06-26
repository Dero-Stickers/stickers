import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Plus, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlbumCover } from "@/components/album/AlbumCover";
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
import { useToast } from "@/hooks/use-toast";
import {
  useGetUserAlbums,
  useListAlbums,
  useAddAlbumToUser,
  useRemoveAlbumFromUser,
  getGetUserAlbumsQueryKey,
  getListAlbumsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";

export function AlbumList() {
  const [activeTab, setActiveTab] = useState<"my" | "available">("my");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [previewAlbum, setPreviewAlbum] = useState<{ title: string; coverUrl?: string | null; totalStickers: number; id: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myAlbums, isLoading: loadingMy } = useGetUserAlbums();
  const { data: allAlbums, isLoading: loadingAll } = useListAlbums();

  // Ordine sempre dal più recente al più vecchio (titolo es. "Calciatori 2025-2026").
  const byTitleDesc = (a: { title: string }, b: { title: string }) => b.title.localeCompare(a.title);
  const myAlbumIds = new Set(myAlbums?.map(a => a.id) ?? []);
  const sortedMyAlbums = [...(myAlbums ?? [])].sort(byTitleDesc);
  const availableAlbums = (allAlbums?.filter(a => a.isPublished && !myAlbumIds.has(a.id)) ?? []).sort(byTitleDesc);

  const addAlbum = useAddAlbumToUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });
        toast({ title: "Album aggiunto", description: "Ora puoi gestire le tue figurine!" });
      },
    },
  });

  const removeAlbum = useRemoveAlbumFromUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });
        setRemoveId(null);
        toast({ title: "Album rimosso" });
      },
    },
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      <AppHeader />
      <div className="px-4 pt-3 text-center shrink-0">
        <h1 className="text-base font-bold text-foreground">Album</h1>
        <p className="text-muted-foreground text-xs">Gestisci le tue collezioni</p>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("my")}
          >
            I miei album ({myAlbums?.length ?? 0})
          </button>
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "available" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("available")}
          >
            Disponibili ({availableAlbums.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 min-h-0">
        {activeTab === "my" && (
          <div className="space-y-2">
            {loadingMy && [1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            {!loadingMy && (myAlbums?.length ?? 0) === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album aggiunto</p>
                <p className="text-sm mt-1">Vai su "Disponibili" per aggiungere il tuo primo album</p>
              </div>
            )}
            {sortedMyAlbums.map(ua => (
              <Card key={ua.id} className="shadow-sm">
                <CardContent className="p-0">
                  <Link href={`/album/${ua.id}`}>
                    <div className="p-4 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-1 min-w-0 mr-3 gap-3">
                          <AlbumCover url={ua.coverUrl} title={ua.title} className="h-12 w-12" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{ua.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ua.totalStickers} figurine totali</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-primary font-bold text-sm">{ua.completionPercent}%</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <Progress value={ua.completionPercent} className="h-1.5 mb-2" />
                      <div className="flex gap-3 text-xs">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          <span className="text-muted-foreground">{ua.owned} possedute</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                          <span className="text-muted-foreground">{ua.duplicates} doppie</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                          <span className="text-muted-foreground">{ua.missing} mancanti</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="px-4 pb-3 flex justify-end border-t border-border/50 pt-2">
                    <button
                      className="text-xs text-destructive flex items-center gap-1 hover:opacity-70 transition-opacity"
                      onClick={() => setRemoveId(ua.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Rimuovi
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "available" && (
          <div className="space-y-2">
            {loadingAll && [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            {!loadingAll && availableAlbums.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Hai già tutti gli album disponibili</p>
              </div>
            )}
            {availableAlbums.map(album => (
              <Card key={album.id} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => setPreviewAlbum(album)}
                      aria-label={`Anteprima ${album.title}`}
                    >
                      <AlbumCover url={album.coverUrl} title={album.title} className="h-12 w-12 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-sm truncate">{album.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{album.totalStickers} figurine</p>
                      </div>
                    </button>
                    <Button
                      aria-label={`Aggiungi ${album.title}`}
                      className="h-11 w-11 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90"
                      disabled={addAlbum.isPending}
                      onClick={() => addAlbum.mutate({ albumId: album.id })}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!previewAlbum} onOpenChange={v => { if (!v) setPreviewAlbum(null); }}>
        <DialogContent className="max-w-xs p-4">
          <DialogHeader>
            <DialogTitle className="text-base text-center">{previewAlbum?.title}</DialogTitle>
          </DialogHeader>
          {previewAlbum?.coverUrl ? (
            <img
              src={previewAlbum.coverUrl}
              alt={`Copertina ${previewAlbum.title}`}
              decoding="async"
              className="w-full rounded-lg object-contain"
            />
          ) : (
            <AlbumCover url={previewAlbum?.coverUrl} title={previewAlbum?.title ?? ""} className="w-full aspect-square" />
          )}
          <p className="text-sm text-muted-foreground text-center">{previewAlbum?.totalStickers} figurine</p>
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold gap-2"
            disabled={addAlbum.isPending}
            onClick={() => { if (previewAlbum) addAlbum.mutate({ albumId: previewAlbum.id }); setPreviewAlbum(null); }}
          >
            <Plus className="h-4 w-4" />
            Aggiungi album
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeId !== null} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i progressi delle figurine per questo album verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeId !== null && removeAlbum.mutate({ albumId: removeId })}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
