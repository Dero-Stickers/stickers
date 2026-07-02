import { useState, useEffect, useMemo } from "react";
import { Search, Package, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetUserAlbums,
  useGetUserAlbumStickers,
  getGetUserAlbumStickersQueryKey,
  useGetMatchesBySticker,
  getGetMatchesByStickerQueryKey,
} from "@workspace/api-client-react";
import { MatchCard } from "@/components/match/MatchCard";

// Ricerca mirata per singola figurina: scegli album -> scegli figurina ->
// vedi chi la offre come doppia. Terza vista della sezione Match.
//
// `initialAlbumId`/`initialStickerId` arrivano dai punti d'ingresso esterni
// (lente Home, pulsante sulla figurina), che pre-selezionano la ricerca.
export function SearchSticker({
  initialAlbumId,
  initialStickerId,
}: {
  initialAlbumId?: number;
  initialStickerId?: number;
}) {
  const [albumId, setAlbumId] = useState<number | undefined>(initialAlbumId);
  const [stickerId, setStickerId] = useState<number | undefined>(initialStickerId);

  // Se i valori pre-selezionati cambiano (nuova navigazione dall'esterno),
  // riallinea la selezione senza rimontare il componente.
  useEffect(() => {
    if (initialAlbumId !== undefined) setAlbumId(initialAlbumId);
    if (initialStickerId !== undefined) setStickerId(initialStickerId);
  }, [initialAlbumId, initialStickerId]);

  const { data: albums, isLoading: loadingAlbums } = useGetUserAlbums();

  // Figurine caricate SOLO quando un album è selezionato (on-demand): evita di
  // scaricare centinaia di figurine finché non servono davvero.
  const { data: stickers, isLoading: loadingStickers } = useGetUserAlbumStickers(
    albumId as number,
    {
      query: {
        queryKey: getGetUserAlbumStickersQueryKey(albumId as number),
        enabled: albumId !== undefined,
      },
    },
  );

  // Ordina le figurine per numero per un menù leggibile.
  const sortedStickers = useMemo(
    () => [...(stickers ?? [])].sort((a, b) => a.number - b.number),
    [stickers],
  );

  const {
    data: holders,
    isLoading: loadingHolders,
    isFetching: fetchingHolders,
  } = useGetMatchesBySticker(stickerId as number, {
    query: {
      queryKey: getGetMatchesByStickerQueryKey(stickerId as number),
      enabled: stickerId !== undefined,
    },
  });

  const results = holders ?? [];
  const searching = stickerId !== undefined && (loadingHolders || fetchingHolders);

  const selectClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground " +
    "focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4">
      {/* Selezione album */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Package className="h-4 w-4 text-primary" />
          Album
        </label>
        <select
          className={selectClass}
          value={albumId ?? ""}
          disabled={loadingAlbums}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : undefined;
            setAlbumId(v);
            setStickerId(undefined); // reset figurina al cambio album
          }}
        >
          <option value="">Scegli un album…</option>
          {albums?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </div>

      {/* Selezione figurina */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Search className="h-4 w-4 text-primary" />
          Figurina
        </label>
        <select
          className={selectClass}
          value={stickerId ?? ""}
          disabled={albumId === undefined || loadingStickers}
          onChange={(e) => setStickerId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">
            {albumId === undefined ? "Prima scegli un album" : "Scegli una figurina…"}
          </option>
          {sortedStickers.map((s) => (
            <option key={s.stickerId} value={s.stickerId}>
              {(s.code || `#${s.number}`) + (s.name ? ` — ${s.name}` : "")}
            </option>
          ))}
        </select>
      </div>

      {/* Risultati */}
      {searching && (
        <div className="space-y-3 pt-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!searching && stickerId !== undefined && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nessuno ha questa figurina disponibile</p>
          <p className="text-sm mt-1">Prova con un'altra figurina o riprova più tardi</p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="grid gap-1.5 md:grid-cols-2 items-start pt-1">
          {results.map((m) => (
            <MatchCard key={m.userId} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
