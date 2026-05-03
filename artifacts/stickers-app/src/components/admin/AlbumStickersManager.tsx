import { useState } from "react";
import { Plus, Save } from "lucide-react";
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
          <p className="text-xs text-muted-foreground">
            Incolla un elenco numerato: ogni riga nel formato &quot;1. Nome&quot; o &quot;1 - Nome&quot;
          </p>
          <Textarea
            value={rawList}
            onChange={e => setRawList(e.target.value)}
            placeholder={"1. Copertina\n2. Lionel Messi\n3. Cristiano Ronaldo\n..."}
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
                      <span className="text-sm font-mono text-muted-foreground">{s.number}</span>
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
