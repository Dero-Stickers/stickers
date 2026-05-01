import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Plus, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

export function AlbumList() {
  const [activeTab, setActiveTab] = useState<"my" | "available">("my");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myAlbums, isLoading: loadingMy } = useGetUserAlbums();
  const { data: allAlbums, isLoading: loadingAll } = useListAlbums();

  const myAlbumIds = new Set(myAlbums?.map(a => a.id) ?? []);
  const availableAlbums = allAlbums?.filter(a => a.isPublished && !myAlbumIds.has(a.id)) ?? [];

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
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold">Album</h1>
        <p className="text-sidebar-foreground/70 text-sm mt-0.5">Gestisci le tue collezioni</p>
      </div>

      <div className="px-4 pt-4 pb-4">
        <div className="flex rounded-lg bg-muted p-1 mb-4">
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

        {activeTab === "my" && (
          <div className="space-y-3">
            {loadingMy && [1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            {!loadingMy && (myAlbums?.length ?? 0) === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album aggiunto</p>
                <p className="text-sm mt-1">Vai su "Disponibili" per aggiungere il tuo primo album</p>
              </div>
            )}
            {myAlbums?.map(ua => (
              <Card key={ua.id} className="shadow-sm">
                <CardContent className="p-0">
                  <Link href={`/album/${ua.id}`}>
                    <div className="p-4 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-semibold text-foreground truncate">{ua.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ua.totalStickers} figurine totali</p>
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
          <div className="space-y-3">
            {loadingAll && [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            {!loadingAll && availableAlbums.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Hai già tutti gli album disponibili</p>
              </div>
            )}
            {availableAlbums.map(album => (
              <Card key={album.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-semibold text-foreground">{album.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{album.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{album.totalStickers} figurine</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">Disponibile</Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold gap-2"
                    disabled={addAlbum.isPending}
                    onClick={() => addAlbum.mutate({ albumId: album.id })}
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi album
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
