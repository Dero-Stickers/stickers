import { useState } from "react";
import { mockAlbums } from "@/mock/albums";
import { mockStickers } from "@/mock/stickers";
import { Plus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function AdminFigurine() {
  const { toast } = useToast();
  const [selectedAlbumId, setSelectedAlbumId] = useState<number>(1);
  const [rawList, setRawList] = useState("");
  const [stickers, setStickers] = useState(mockStickers[1] ?? []);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const publishedAlbums = mockAlbums.filter(a => a.isPublished);

  const handleAlbumChange = (albumId: number) => {
    setSelectedAlbumId(albumId);
    setStickers(mockStickers[albumId] ?? []);
  };

  const handleBatchInsert = () => {
    if (!rawList.trim()) return;
    const lines = rawList.split("\n").filter(Boolean);
    const newStickers = lines.map((line, i) => {
      const match = line.match(/^(\d+)[.\s-]+(.+)$/);
      if (match) return { id: Date.now() + i, albumId: selectedAlbumId, number: parseInt(match[1], 10), name: match[2].trim(), description: null };
      return null;
    }).filter(Boolean) as typeof stickers;
    setStickers(prev => [...prev, ...newStickers]);
    setRawList("");
    toast({ title: `${newStickers.length} figurine inserite` });
  };

  const startEdit = (id: number, name: string) => { setEditingId(id); setEditName(name); };
  const saveEdit = (id: number) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, name: editName } : s));
    setEditingId(null);
    toast({ title: "Figurina aggiornata" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestione Figurine</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gestisci le figurine per album</p>
      </div>

      {/* Album selector */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <label className="text-sm font-medium text-foreground block mb-2">Seleziona album</label>
          <select
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            value={selectedAlbumId}
            onChange={e => handleAlbumChange(parseInt(e.target.value, 10))}
          >
            {publishedAlbums.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Batch insert */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inserimento rapido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Incolla un elenco numerato: ogni riga nel formato "1. Nome" o "1 - Nome"</p>
          <Textarea
            value={rawList}
            onChange={e => setRawList(e.target.value)}
            placeholder={"1. Copertina\n2. Lionel Messi\n3. Cristiano Ronaldo\n..."}
            rows={6}
          />
          <Button className="w-full gap-2 bg-primary text-primary-foreground" onClick={handleBatchInsert}>
            <Plus className="h-4 w-4" />
            Inserisci figurine
          </Button>
        </CardContent>
      </Card>

      {/* Sticker table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Figurine ({stickers.length})</CardTitle>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                <th className="text-left px-4 py-2 font-medium w-16">#</th>
                <th className="text-left px-4 py-2 font-medium">Nome</th>
                <th className="text-right px-4 py-2 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {stickers.map((s, i) => (
                <tr key={s.id} className={`${i < stickers.length - 1 ? "border-b border-border/40" : ""}`}>
                  <td className="px-4 py-2">
                    <span className="text-sm font-mono text-muted-foreground">{s.number}</span>
                  </td>
                  <td className="px-4 py-2">
                    {editingId === s.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" autoFocus />
                    ) : (
                      <span className="text-sm text-foreground">{s.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {editingId === s.id ? (
                      <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-primary" onClick={() => saveEdit(s.id)}>
                        <Save className="h-3.5 w-3.5" />
                        Salva
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEdit(s.id, s.name)}>
                        Modifica
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
