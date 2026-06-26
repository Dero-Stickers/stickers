import { useState } from "react";
import { Plus, Eye, EyeOff, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useListAlbums,
  useCreateAlbum,
  useUpdateAlbum,
  useToggleAlbumPublish,
} from "@workspace/api-client-react";
import type { Album } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AlbumStickersManager } from "@/components/admin/AlbumStickersManager";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";

// Chiave di cache DEDICATA all'admin: la lista admin (TUTTI gli album, anche
// Off Line) non deve condividere cache con la vista utente (solo On Line),
// altrimenti gli album nascosti spariscono anche dall'admin.
const ADMIN_ALBUMS_KEY = ["admin", "albums"] as const;

/**
 * Pannello UNICO di gestione album: rinomina (l'unico dato che "Modifica"
 * gestiva) + gestione figurine, in un solo posto — niente due pulsanti separati.
 */
function AlbumManagePanel({ album }: { album: Album }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(album.title);

  const updateAlbum = useUpdateAlbum({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ADMIN_ALBUMS_KEY });
        toast({ title: "Nome album aggiornato" });
      },
    },
  });

  const dirty = title.trim().length > 0 && title.trim() !== album.title;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">Nome album</label>
        <div className="flex gap-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Calciatori 2025-2026" />
          <Button
            className="bg-primary text-primary-foreground shrink-0"
            disabled={!dirty || updateAlbum.isPending}
            onClick={() => updateAlbum.mutate({ albumId: album.id, data: { title: title.trim() } })}
          >
            {updateAlbum.isPending ? "..." : "Rinomina"}
          </Button>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <AlbumStickersManager albumId={album.id} />
      </div>
    </div>
  );
}

export function AdminAlbums() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: albums, isLoading } = useListAlbums({ query: { queryKey: ADMIN_ALBUMS_KEY } });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [manageAlbum, setManageAlbum] = useState<Album | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADMIN_ALBUMS_KEY });

  const createAlbum = useCreateAlbum({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowCreate(false);
        setNewTitle("");
        toast({ title: "Album creato" });
      },
    },
  });

  const togglePublish = useToggleAlbumPublish({
    mutation: {
      onSuccess: (_, vars) => {
        invalidate();
        toast({ title: vars.data.isPublished ? "Album On Line" : "Album Off Line" });
      },
    },
  });

  return (
    <AdminPage
      title="Gestione Album"
      subtitle={isLoading ? "..." : `${albums?.length ?? 0} album totali`}
      actions={
        <Button
          className="gap-2 bg-primary text-primary-foreground"
          onClick={() => { setNewTitle(""); setShowCreate(true); }}
        >
          <Plus className="h-4 w-4" />
          Crea album
        </Button>
      }
    >
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>Titolo</th>
            <th className="hidden md:table-cell">Figurine</th>
            <th>Stato</th>
            <th>Utenti</th>
            <th>Azioni</th>
          </>
        }
      >
        {(albums ?? []).map(album => (
          <tr key={album.id}>
            <td>
              <span className="font-medium text-foreground">{album.title}</span>
            </td>
            <td className="hidden md:table-cell text-center text-foreground">{album.totalStickers}</td>
            <td className="text-center">
              <Badge className={album.isPublished ? "bg-green-100 text-green-700 border-0" : "bg-orange-100 text-orange-700 border-0"}>
                {album.isPublished ? "On Line" : "Off Line"}
              </Badge>
            </td>
            <td className="text-center text-foreground">{album.userCount ?? 0}</td>
            <td>
              <div className="flex items-center justify-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => setManageAlbum(album)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Gestisci</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 gap-1 text-xs"
                  disabled={togglePublish.isPending}
                  onClick={() => togglePublish.mutate({ albumId: album.id, data: { isPublished: !album.isPublished } })}
                >
                  {album.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{album.isPublished ? "Off Line" : "On Line"}</span>
                </Button>
              </div>
            </td>
          </tr>
        ))}
        {(albums?.length ?? 0) === 0 && (
          <tr>
            <td colSpan={5} className="text-center text-muted-foreground">
              <div className="py-8">Nessun album. Crea il primo.</div>
            </td>
          </tr>
        )}
      </AdminTable>

      {/* Gestione album: rinomina + figurine in un unico posto */}
      <Dialog open={!!manageAlbum} onOpenChange={v => { if (!v) setManageAlbum(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestisci album — {manageAlbum?.title}</DialogTitle>
            <DialogDescription>Rinomina l'album e gestisci le sue figurine.</DialogDescription>
          </DialogHeader>
          {manageAlbum && <AlbumManagePanel key={manageAlbum.id} album={manageAlbum} />}
        </DialogContent>
      </Dialog>

      {/* Creazione nuovo album */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crea nuovo album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Titolo</label>
              <Input className="mt-1" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Es. Calciatori 2025-2026" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Annulla</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={() => { if (newTitle.trim()) createAlbum.mutate({ data: { title: newTitle.trim() } }); }}
                disabled={createAlbum.isPending}
              >
                {createAlbum.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
