import { useState } from "react";
import { mockAlbums } from "@/mock/albums";
import { Plus, Edit, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Album = typeof mockAlbums[0] & { isPublished: boolean };

export function AdminAlbums() {
  const { toast } = useToast();
  const [albums, setAlbums] = useState<Album[]>(mockAlbums as Album[]);
  const [showCreate, setShowCreate] = useState(false);
  const [editAlbum, setEditAlbum] = useState<Album | null>(null);
  const [form, setForm] = useState({ title: "", description: "", totalStickers: "" });

  const handleToggle = (id: number) => {
    setAlbums(prev => prev.map(a => a.id === id ? { ...a, isPublished: !a.isPublished } : a));
    const album = albums.find(a => a.id === id);
    toast({ title: album?.isPublished ? "Album nascosto" : "Album pubblicato" });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editAlbum) {
      setAlbums(prev => prev.map(a => a.id === editAlbum.id ? { ...a, title: form.title, description: form.description, totalStickers: parseInt(form.totalStickers || "0", 10) } : a));
    } else {
      const newAlbum: Album = { id: Date.now(), title: form.title, description: form.description, coverUrl: "", totalStickers: parseInt(form.totalStickers || "0", 10), isPublished: false, createdAt: new Date().toISOString() };
      setAlbums(prev => [...prev, newAlbum]);
    }
    setShowCreate(false);
    setEditAlbum(null);
    setForm({ title: "", description: "", totalStickers: "" });
    toast({ title: editAlbum ? "Album aggiornato" : "Album creato" });
  };

  const openEdit = (album: Album) => {
    setEditAlbum(album);
    setForm({ title: album.title, description: album.description ?? "", totalStickers: String(album.totalStickers) });
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Album</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{albums.length} album totali</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground" onClick={() => { setEditAlbum(null); setForm({ title: "", description: "", totalStickers: "" }); setShowCreate(true); }}>
          <Plus className="h-4 w-4" />
          Crea album
        </Button>
      </div>

      <Card className="shadow-sm">
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
              {albums.map((album, i) => (
                <tr key={album.id} className={`${i < albums.length - 1 ? "border-b border-border/50" : ""}`}>
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
                      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => handleToggle(album.id)}>
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
            <div>
              <label className="text-sm font-medium text-foreground">Numero figurine totali</label>
              <Input className="mt-1" type="number" value={form.totalStickers} onChange={e => setForm(p => ({ ...p, totalStickers: e.target.value }))} placeholder="Es. 672" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreate(false); setEditAlbum(null); }}>Annulla</Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleSave}>Salva</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
