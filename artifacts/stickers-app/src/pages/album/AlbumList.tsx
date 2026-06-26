import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { BookOpen, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const [removeStep, setRemoveStep] = useState<1 | 2>(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myAlbums, isLoading: loadingMy } = useGetUserAlbums();
  const { data: allAlbums, isLoading: loadingAll } = useListAlbums();

  // Ordine sempre dal più recente al più vecchio (titolo es. "Calciatori 2025-2026").
  const byTitleDesc = (a: { title: string }, b: { title: string }) => b.title.localeCompare(a.title);
  // Al primo caricamento, se l'utente non ha ancora album, apri direttamente
  // su "Disponibili" (la scheda "I miei album" vuota non è utile come default).
  // Una sola volta: dopo, la scelta manuale del tab resta libera.
  const didInitTab = useRef(false);
  useEffect(() => {
    if (didInitTab.current || myAlbums === undefined) return;
    didInitTab.current = true;
    if ((myAlbums?.length ?? 0) === 0) setActiveTab("available");
  }, [myAlbums]);

  const myAlbumIds = new Set(myAlbums?.map(a => a.id) ?? []);
  const sortedMyAlbums = [...(myAlbums ?? [])].sort(byTitleDesc);
  // Tutti gli album pubblicati: quelli già aggiunti restano visibili ma disabilitati.
  const availableAlbums = (allAlbums?.filter(a => a.isPublished) ?? []).sort(byTitleDesc);

  const addAlbum = useAddAlbumToUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });
        toast({ title: "Album aggiunto", description: "Ora puoi gestire le tue figurine!", duration: 3000 });
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
          <div className="grid gap-2 md:grid-cols-2 items-start">
            {loadingMy && [1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            {!loadingMy && (myAlbums?.length ?? 0) === 0 && (
              <div className="text-center py-12 text-muted-foreground md:col-span-2">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album aggiunto</p>
                <p className="text-sm mt-1">Vai su "Disponibili" per aggiungere il tuo primo album</p>
              </div>
            )}
            {sortedMyAlbums.map(ua => (
              <Card key={ua.id} className="shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    <Link href={`/album/${ua.id}`} className="flex flex-1 min-w-0 items-center gap-3 p-3 cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{ua.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{ua.totalStickers} figurine</p>
                      </div>
                      <span className="text-primary font-bold text-sm shrink-0">{ua.completionPercent}%</span>
                    </Link>
                    <button
                      className="self-stretch flex items-center px-3 text-destructive border-l border-border/50"
                      onClick={() => { setRemoveStep(1); setRemoveId(ua.id); }}
                      aria-label={`Rimuovi ${ua.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "available" && (
          <div className="grid gap-2 md:grid-cols-2 items-start">
            {loadingAll && [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            {!loadingAll && availableAlbums.length === 0 && (
              <div className="text-center py-12 text-muted-foreground md:col-span-2">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album disponibile al momento</p>
              </div>
            )}
            {availableAlbums.map(album => {
              const added = myAlbumIds.has(album.id);
              return (
              <Card key={album.id} className={`shadow-sm ${added ? "opacity-60" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {album.totalStickers} figurine{added ? " · Già aggiunto" : ""}
                      </p>
                    </div>
                    {added ? (
                      <div
                        className="h-11 w-11 shrink-0 rounded-full p-0 flex items-center justify-center bg-muted text-muted-foreground"
                        aria-label="Già aggiunto"
                        title="Già aggiunto"
                      >
                        <Check className="h-5 w-5" />
                      </div>
                    ) : (
                      <Button
                        aria-label={`Aggiungi ${album.title}`}
                        className="h-11 w-11 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={addAlbum.isPending}
                        onClick={() => addAlbum.mutate({ albumId: album.id })}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={removeId !== null} onOpenChange={v => { if (!v) { setRemoveId(null); setRemoveStep(1); } }}>
        <AlertDialogContent>
          {removeStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tutti i progressi delle figurine per questo album verranno eliminati.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setRemoveStep(2)}
                >
                  Continua
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei davvero sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'operazione è definitiva e non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => removeId !== null && removeAlbum.mutate({ albumId: removeId })}
                >
                  Sì, rimuovi
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
