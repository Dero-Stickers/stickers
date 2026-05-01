import { useState } from "react";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useListAlbums,
  useCreateAlbum,
  useUpdateAlbum,
  useToggleAlbumPublish,
  getListAlbumsQueryKey,
} from "@workspace/api-client-react";
import type { Album } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function AdminAlbums() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: albums, isLoading } = useListAlbums();
  const [showCreate, setShowCreate] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [form, setForm] = useState({ title: "", description: "", totalStickers: "" });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });

  const createAlbum = useCreateAlbum({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowCreate(false);
        setForm({ title: "", description: "", totalStickers: "" });
        toast({ title: "Album creato" });
      },
    },
  });

  const updateAlbum = useUpdateAlbum({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowCreate(false);
        setEditAlbum(null);
        setForm({ title: "", description: "", totalStickers: "" });
        toast({ title: "Album aggiornato" });
      },
    },
  });

  const togglePublish = useToggleAlbumPublish({
    mutation: {
      onSuccess: (_, vars) => {
        invalidate();
        toast({ title: vars.data.isPublished ? "Album pubblicato" : "Album nascosto" });
      },
    },
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    const data = {
      title: form.title,
      description: form.description || undefined,
    };
    if (editAlbum) {
      updateAlbum.mutate({ albumId: editAlbum.id, data });
    } else {
      createAlbum.mutate({ data });
    }
  };

  const openEdit = (album: Album) => {
    setEditAlbum(album);
    setForm({ title: album.title, description: album.description ?? "", totalStickers: String(album.totalStickers) });
    setShowCreate(true);
  };

  const isPending = createAlbum.isPending || updateAlbum.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Album</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{isLoading ? "..." : `${albums?.length ?? 0} album totali`}</p>
        </div>
        <Button
          className="gap-2 bg-primary text-primary-foreground"
          onClick={() => { setEditAlbum(null); setForm({ title: "", description: "", totalStickers: "" }); setShowCreate(true); }}
        >
          <Plus className="h-4 w-4" />
          Crea album
        </Button>
      </div>

      <Card className="shadow-sm">
        {isLoading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        )}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Titolo</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Figurine</th>
                  <th className="text-left px-4 py-3 font-medium">Stato</th>
                  <th className="text-right px-4 py-3 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {(albums ?? []).map((album, i) => (
                  <tr key={album.id} className={`${i < (albums?.length ?? 0) - 1 ? "border-b border-border/50" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm text-foreground">{album.title}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{album.description}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-foreground">{album.totalStickers}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={album.isPublished ? "bg-green-100 text-green-700 border-0" : "bg-muted text-muted-foreground border-0"}>
                        {album.isPublished ? "Pubblicato" : "Nascosto"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => openEdit(album)}>
                          <Edit className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Modifica</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 gap-1 text-xs"
                          disabled={togglePublish.isPending}
                          onClick={() => togglePublish.mutate({ albumId: album.id, data: { isPublished: !album.isPublished } })}
                        >
                          {album.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">{album.isPublished ? "Nascondi" : "Pubblica"}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setEditAlbum(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAlbum ? "Modifica album" : "Crea nuovo album"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Titolo</label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Es. Calciatori 2025-2026" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Descrizione</label>
              <Input className="mt-1" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrizione breve" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setEditAlbum(null); }}>Annulla</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSave} disabled={isPending}>
                {isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
