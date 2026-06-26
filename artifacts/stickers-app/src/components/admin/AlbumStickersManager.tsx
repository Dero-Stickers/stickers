import { useState } from "react";
import { Plus, Save, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListAlbumStickers,
  useBatchInsertStickers,
  useUpdateSticker,
  getListAlbumStickersQueryKey,
} from "@workspace/api-client-react";
import type { Sticker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  albumId: number;
}

export function AlbumStickersManager({ albumId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stickers, isLoading: loadingStickers } = useListAlbumStickers(albumId, {
    query: {
      queryKey: getListAlbumStickersQueryKey(albumId),
      enabled: Number.isFinite(albumId) && albumId > 0,
    },
  });

  const [rawList, setRawList] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAlbumStickersQueryKey(albumId) });

  const batchInsert = useBatchInsertStickers({
    mutation: {
      onSuccess: (res) => {
        invalidate();
        setRawList("");
        toast({ title: `${res.inserted} figurine inserite` });
      },
    },
  });

  const updateSticker = useUpdateSticker({
    mutation: {
      onSuccess: () => {
        invalidate();
        setEditingId(null);
        toast({ title: "Figurina aggiornata" });
      },
    },
  });

  const handleBatchInsert = () => {
    if (!rawList.trim()) return;
    batchInsert.mutate({ albumId, data: { rawList } });
  };

  const startEdit = (s: Sticker) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, description: s.description ?? "" });
  };

  const saveEdit = (stickerId: number, number: number) => {
    updateSticker.mutate({
      albumId,
      stickerId,
      data: { number, name: editForm.name, description: editForm.description || undefined },
    });
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Inserimento rapido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              1. Apri la pagina della raccolta sul sito Panini e clicca <strong>&quot;checklist completa&quot;</strong>.<br />
              2. Seleziona tutta la lista, <strong>copiala</strong> e incollala qui sotto.<br />
              3. Clicca <strong>Inserisci figurine</strong>: vengono importate mantenendo <strong>codice e ordine</strong> originali.
            </p>
            <p>
              Ogni riga nel formato <span className="font-mono">codice - Nome</span> — il codice può essere
              numerico o speciale (es. <span className="font-mono">001 - Trofeo Serie A</span>,
              <span className="font-mono"> UPD01 - Milan</span>).
            </p>
            <a
              href="https://www.panini.it/shp_ita_it/figurine-panini/sport/calciatori/figurine-e-card-mancanti.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Trova l&apos;album sul sito Panini
            </a>
          </div>
          <Textarea
            value={rawList}
            onChange={e => setRawList(e.target.value)}
            placeholder={"001 - Trofeo Serie A\n002 - Player of the Match\n003 - Atalanta\n…\nUPD01 - Milan - Vincitrice Supercup"}
            rows={6}
          />
          <Button
            className="w-full gap-2 bg-primary text-primary-foreground"
            onClick={handleBatchInsert}
            disabled={batchInsert.isPending || !rawList.trim()}
          >
            <Plus className="h-4 w-4" />
            {batchInsert.isPending ? "Inserimento..." : "Inserisci figurine"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Figurine ({loadingStickers ? "..." : (stickers?.length ?? 0)})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto max-h-[55vh]">
          {loadingStickers ? (
            <div className="p-4"><Skeleton className="h-20 rounded" /></div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-2 font-medium w-16">#</th>
                  <th className="text-left px-4 py-2 font-medium">Nome</th>
                  <th className="text-right px-4 py-2 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {(stickers ?? []).map((s, i) => (
                  <tr key={s.id} className={`${i < (stickers?.length ?? 0) - 1 ? "border-b border-border/40" : ""}`}>
                    <td className="px-4 py-2">
                      <span className="text-sm font-mono text-muted-foreground">{s.code || s.number}</span>
                    </td>
                    <td className="px-4 py-2">
                      {editingId === s.id ? (
                        <Input
                          value={editForm.name}
                          onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-foreground">{s.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingId === s.id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 gap-1 text-xs text-primary"
                          disabled={updateSticker.isPending}
                          onClick={() => saveEdit(s.id, s.number)}
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salva
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEdit(s)}>
                          Modifica
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(stickers ?? []).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-muted-foreground">Nessuna figurina in questo album</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
