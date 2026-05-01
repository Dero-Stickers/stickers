import { useState } from "react";
import { Link } from "wouter";
import { mockAlbums } from "@/mock/albums";
import { BookOpen, Plus, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const MY_ALBUM_IDS = [1, 2];
const MOCK_STATS: Record<number, { owned: number; duplicates: number }> = {
  1: { owned: 210, duplicates: 35 },
  2: { owned: 180, duplicates: 20 },
};

export function AlbumList() {
  const [activeTab, setActiveTab] = useState<"my" | "available">("my");
  const [myAlbumIds, setMyAlbumIds] = useState<number[]>(MY_ALBUM_IDS);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const { toast } = useToast();

  const myAlbums = mockAlbums.filter(a => myAlbumIds.includes(a.id) && a.isPublished);
  const availableAlbums = mockAlbums.filter(a => !myAlbumIds.includes(a.id) && a.isPublished);

  const handleAdd = (albumId: number) => {
    setMyAlbumIds(prev => [...prev, albumId]);
    toast({ title: "Album aggiunto", description: "Ora puoi gestire le tue figurine!" });
  };

  const handleRemove = () => {
    if (removeId === null) return;
    setMyAlbumIds(prev => prev.filter(id => id !== removeId));
    setRemoveId(null);
    toast({ title: "Album rimosso", description: "L'album è stato rimosso dalla tua collezione." });
  };

  return (
    <div className="min-h-full">
      <div className="bg-sidebar text-sidebar-foreground px-4 pt-12 pb-6">
        <h1 className="text-xl font-bold">Album</h1>
        <p className="text-sidebar-foreground/70 text-sm mt-0.5">Gestisci le tue collezioni</p>
      </div>

      <div className="px-4 pt-4 pb-4">
        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-1 mb-4">
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("my")}
          >
            I miei album ({myAlbums.length})
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
            {myAlbums.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album aggiunto</p>
                <p className="text-sm mt-1">Vai su "Disponibili" per aggiungere il tuo primo album</p>
              </div>
            )}
            {myAlbums.map(album => {
              const stats = MOCK_STATS[album.id] ?? { owned: 0, duplicates: 0 };
              const missing = album.totalStickers - stats.owned - stats.duplicates;
              const pct = Math.round(((stats.owned + stats.duplicates) / album.totalStickers) * 100);
              return (
                <Card key={album.id} className="shadow-sm">
                  <CardContent className="p-0">
                    <Link href={`/album/${album.id}`}>
                      <div className="p-4 cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="font-semibold text-foreground truncate">{album.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{album.totalStickers} figurine totali</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-primary font-bold text-sm">{pct}%</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5 mb-2" />
                        <div className="flex gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                            <span className="text-muted-foreground">{stats.owned} possedute</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                            <span className="text-muted-foreground">{stats.duplicates} doppie</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                            <span className="text-muted-foreground">{Math.max(0, missing)} mancanti</span>
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="px-4 pb-3 flex justify-end border-t border-border/50 pt-2">
                      <button
                        className="text-xs text-destructive flex items-center gap-1 hover:opacity-70 transition-opacity"
                        onClick={() => setRemoveId(album.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Rimuovi
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "available" && (
          <div className="space-y-3">
            {availableAlbums.length === 0 && (
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
                    onClick={() => handleAdd(album.id)}
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
              Tutti i progressi delle figurine per questo album verranno eliminati. L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleRemove}>
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
