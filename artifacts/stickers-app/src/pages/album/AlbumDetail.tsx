import { useState, useRef, useMemo, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetUserAlbumStickers,
  useUpdateUserStickerState,
  useBulkSetUserStickers,
  useRemoveAlbumFromUser,
  useGetUserAlbums,
  getGetUserAlbumsQueryKey,
  getGetUserAlbumStickersQueryKey,
} from "@workspace/api-client-react";
import type { UserSticker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BulkStateDialog, type BulkState } from "@/components/album/BulkStateDialog";
import { StickerCell, stateColors, type StickerState } from "@/components/album/StickerCell";
import { isGuideDemoAlbumId, GUIDE_DEMO_ALBUM, buildGuideDemoStickers } from "@/lib/guide/guide-demo";

type FilterType = "tutte" | "mancanti" | "possedute" | "doppie";

const NEXT_STATE: Record<StickerState, StickerState> = {
  mancante: "posseduta",
  posseduta: "doppia",
  doppia: "mancante",
};

export function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const albumId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterType>("tutte");
  const [selectedSticker, setSelectedSticker] = useState<UserSticker | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<BulkState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Long-press sui chip stato (Mie/Doppie/Mancanti): timer + flag per NON far
  // scattare anche il cambio filtro al rilascio.
  const chipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipLongPressed = useRef(false);

  // ALBUM DI PROVA della guida (id negativo): dati demo locali, NESSUNA chiamata
  // API (hook disabilitato). Le interazioni reali sono disattivate più sotto:
  // durante la guida i gesti sono simulati dal motore (vedi GuideOverlay).
  const isGuideDemo = isGuideDemoAlbumId(albumId);

  const { data: userAlbums } = useGetUserAlbums();
  const albumInfo = isGuideDemo ? GUIDE_DEMO_ALBUM : userAlbums?.find(a => a.id === albumId);

  const { data: apiStickers, isLoading: apiLoading } = useGetUserAlbumStickers(albumId, {
    query: { enabled: !isGuideDemo, queryKey: getGetUserAlbumStickersQueryKey(albumId) },
  });
  const demoStickers = useMemo(() => (isGuideDemo ? buildGuideDemoStickers() : null), [isGuideDemo]);
  const stickers = isGuideDemo ? demoStickers! : apiStickers;
  const isLoading = isGuideDemo ? false : apiLoading;

  const stickersKey = getGetUserAlbumStickersQueryKey(albumId);
  const updateState = useUpdateUserStickerState({
    mutation: {
      // Aggiornamento OTTIMISTICO: la cella cambia stato subito, senza rifare la
      // query e senza ri-scaricare/ri-renderizzare tutte le ~900 figurine.
      onMutate: async (vars: { albumId: number; stickerId: number; data: { state: string } }) => {
        await queryClient.cancelQueries({ queryKey: stickersKey });
        const prev = queryClient.getQueryData<UserSticker[]>(stickersKey);
        queryClient.setQueryData<UserSticker[]>(stickersKey, old =>
          old?.map(s => (s.stickerId === vars.stickerId ? { ...s, state: vars.data.state as UserSticker["state"] } : s)),
        );
        return { prev };
      },
      onError: (_err, _vars, ctx) => {
        const prev = (ctx as { prev?: UserSticker[] } | undefined)?.prev;
        if (prev) queryClient.setQueryData(stickersKey, prev);
      },
      onSuccess: () => {
        // I conteggi (percentuale, possedute…) vivono in getUserAlbums: basta
        // aggiornare quello (query leggera), non l'intera griglia.
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
      },
    },
  });

  const bulkSet = useBulkSetUserStickers({
    mutation: {
      onSuccess: (res) => {
        // Azione di massa una tantum: qui un refetch della griglia è corretto
        // (a differenza del tap singolo, che resta ottimistico).
        queryClient.invalidateQueries({ queryKey: stickersKey });
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        setBulkTarget(null);
        toast({
          title: "Figurine aggiornate",
          description: res.updated > 0
            ? `${res.updated} figurine aggiornate.`
            : "Erano già tutte in questo stato.",
        });
      },
      onError: () => toast({ title: "Operazione non riuscita", variant: "destructive" }),
    },
  });

  const removeAlbum = useRemoveAlbumFromUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        toast({ title: "Album rimosso" });
        setLocation("/album");
      },
    },
  });

  // Callback STABILI (useCallback): permettono a StickerCell (memo) di NON
  // ri-renderizzare le celle non cambiate. `mutate` di react-query è stabile.
  const { mutate: mutateStickerState } = updateState;
  const tapSticker = useCallback((s: UserSticker) => {
    if (albumId < 0) return; // album di prova della guida: nessuna scrittura
    const nextState = NEXT_STATE[(s.state ?? "mancante") as StickerState];
    mutateStickerState({ albumId, stickerId: s.stickerId, data: { state: nextState } });
  }, [albumId, mutateStickerState]);

  const handlePointerDown = useCallback((s: UserSticker) => {
    longPressTimer.current = setTimeout(() => setSelectedSticker(s), 500);
  }, []);
  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Chip stato: tenere premuto apre la conferma "imposta tutte a questo stato".
  // Il tap normale resta il cambio filtro.
  const handleChipDown = (target: BulkState) => {
    chipLongPressed.current = false;
    chipTimer.current = setTimeout(() => { chipLongPressed.current = true; setBulkTarget(target); }, 500);
  };
  const handleChipUp = () => { if (chipTimer.current) clearTimeout(chipTimer.current); };
  const handleChipClick = (key: FilterType) => {
    if (chipLongPressed.current) { chipLongPressed.current = false; return; } // long-press: niente cambio filtro
    setFilter(key);
  };

  // Conteggi memoizzati: ricalcolati solo quando cambiano le figurine, non a
  // ogni render (prima erano 3 filter su ~700 elementi per render).
  const { owned, duplicates, total, missing, pct } = useMemo(() => {
    const list = stickers ?? [];
    const owned = list.filter(s => s.state === "posseduta").length;
    const duplicates = list.filter(s => s.state === "doppia").length;
    const total = list.length;
    const missing = Math.max(0, total - owned - duplicates);
    const pct = total > 0 ? Math.round(((owned + duplicates) / total) * 100) : 0;
    return { owned, duplicates, total, missing, pct };
  }, [stickers]);

  // Lista filtrata memoizzata: filter+sort su ~700-900 elementi solo quando
  // cambiano figurine o filtro (prima a ogni render). `.filter` crea un nuovo
  // array, quindi `.sort` non muta la cache di react-query.
  const filteredStickers = useMemo(() => (stickers ?? [])
    .filter(s => {
      if (filter === "tutte") return true;
      // "Mancanti" = tutto ciò che non è posseduta né doppia → coincide sempre
      // col badge (total - possedute - doppie), anche con stato nullo.
      if (filter === "mancanti") return s.state !== "posseduta" && s.state !== "doppia";
      if (filter === "possedute") return s.state === "posseduta";
      if (filter === "doppie") return s.state === "doppia";
      return true;
    })
    // Ordine stabile per numero: la griglia non dipende dall'ordine del backend
    // né si riordina quando una figurina cambia stato.
    .sort((a, b) => a.number - b.number), [stickers, filter]);

  // Album a codici ALFANUMERICI (es. Mondiali: MEX10, FWC19). La griglia resta
  // IDENTICA agli altri album (stesse 7 colonne, stesse proporzioni di cella):
  // il codice lungo entra nella cella quadrata standard andando su due righe
  // (StickerCell). Il flag serve solo ad attivare i divisori di blocco.
  const hasLongCodes = useMemo(
    () => (stickers ?? []).some(s => (s.code?.length ?? 0) > 3),
    [stickers],
  );

  // Suddivisione in BLOCCHI per nazione/gruppo (SOLO album a codici alfanumerici):
  // al cambio di sigla (MEX → RSA) inizia un nuovo blocco con la sua intestazione
  // (nome nazione + linea sottile) MESSA SOPRA la griglia, non dentro una cella.
  // Ogni blocco ha la propria griglia → l'header sta in un contenitore separato,
  // così non ruba il posto a una figurina né rompe il layout su WebKit (un header
  // `col-span-full` dentro l'unica grid mandava in tilt aspect-square+content-visibility).
  // Etichetta = suffisso " - Squadra" della maggioranza del blocco (es. "Mexico");
  // altrimenti la sigla stessa (FWC, CC). Blocchi di 1 sola figurina (logo "00") muti.
  type StickerBlock = { key: string; label: string | null; stickers: typeof filteredStickers };
  const stickerBlocks = useMemo<StickerBlock[]>(() => {
    if (!hasLongCodes) return [{ key: "all", label: null, stickers: filteredStickers }];
    const blocks: StickerBlock[] = [];
    let run: typeof filteredStickers = [];
    let prevPrefix: string | null = null;
    const prefixOf = (code: string) => code.match(/^[A-Za-z]+/)?.[0] ?? code;
    const flush = () => {
      if (run.length === 0) return;
      const counts = new Map<string, number>();
      for (const s of run) {
        const m = s.name?.match(/ - ([^-]+)$/);
        if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const label = run.length > 1
        ? (top && top[1] >= run.length / 2 ? top[0] : prevPrefix)
        : null;
      blocks.push({ key: `b-${blocks.length}`, label, stickers: run });
      run = [];
    };
    for (const s of filteredStickers) {
      const p = prefixOf(s.code || String(s.number));
      if (p !== prevPrefix) { flush(); prevPrefix = p; }
      run.push(s);
    }
    flush();
    return blocks;
  }, [filteredStickers, hasLongCodes]);

  // Ogni voce è insieme CONTATORE e FILTRO: mostra il numero + l'etichetta ed è
  // cliccabile (tap = filtra; long-press = imposta tutte a quello stato, tranne
  // "Tutte"). `count` = valore mostrato; `numberColor` = colore del numero.
  // bulkState = stato applicato col long-press. "Tutte" non ha azione (solo filtro).
  const filterOptions: {
    key: FilterType; label: string; count: number; numberColor: string; bulkState?: BulkState;
  }[] = [
    { key: "tutte", label: "Tutte", count: total, numberColor: "text-foreground" },
    { key: "possedute", label: "Mie", count: owned, numberColor: "text-green-600", bulkState: "posseduta" },
    { key: "doppie", label: "Doppie", count: duplicates, numberColor: "text-red-500", bulkState: "doppia" },
    // Grigio come le celle "mancante" della griglia (stateColors) — coerenza visiva.
    { key: "mancanti", label: "Mancanti", count: missing, numberColor: "text-gray-400", bulkState: "mancante" },
  ];

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 21 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}
        </div>
      </div>
    );
  }

  const albumTitle = albumInfo?.title ?? `Album #${albumId}`;

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-3 pb-3 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <button
            className="shrink-0 -ml-1 p-1.5 rounded-full text-foreground active:scale-95 transition-transform"
            onClick={() => setLocation("/album")}
            aria-label="Torna agli album"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold leading-tight text-foreground text-center pr-7">{albumTitle}</h1>
        </div>
        {/* 4 CARD-PULSANTE: ognuna è insieme contatore E filtro (tap = filtra,
            long-press = imposta tutte a quello stato). Sfondo bianco, angoli
            arrotondati, touch-friendly; quella attiva ha bordo/anello primario. */}
        <div className="grid grid-cols-4 gap-2" data-guide="guide-filters">
          {filterOptions.map(opt => {
            const active = filter === opt.key;
            return (
              <button
                key={opt.key}
                data-guide={`guide-filter-${opt.key}`}
                onClick={() => handleChipClick(opt.key)}
                onPointerDown={opt.bulkState ? () => handleChipDown(opt.bulkState!) : undefined}
                onPointerUp={opt.bulkState ? handleChipUp : undefined}
                onPointerLeave={opt.bulkState ? handleChipUp : undefined}
                aria-pressed={active}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl border bg-card px-1 py-2.5 text-center select-none transition-all active:scale-95 ${
                  active ? "border-primary ring-2 ring-primary/30 shadow-sm" : "border-border"
                }`}
              >
                <span className={`text-xl font-bold leading-none tabular-nums ${opt.numberColor}`}>{opt.count}</span>
                <span className="text-[11px] font-medium text-muted-foreground leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-primary">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 min-h-0" data-guide="guide-sticker-grid">
        {filteredStickers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">Nessuna figurina in questa categoria</p>
          </div>
        )}
        {stickerBlocks.map((block, blockIdx) => (
          // Intestazione (nome nazione + linea sottile) SOPRA la griglia del
          // blocco — fuori dalla grid, così è a tutta larghezza senza rubare il
          // posto a una figurina. Ogni blocco ha la sua griglia (celle identiche
          // agli altri album). Lo stacco lo danno header + spazio tra blocchi.
          <div key={block.key} className="mb-1">
            {block.label && (
              <div className="flex items-center gap-2 pt-2 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">{block.label}</span>
                <div className="flex-1 border-t border-border" />
              </div>
            )}
            <div className="grid gap-1.5 grid-cols-7 sm:grid-cols-9 md:grid-cols-10 lg:grid-cols-12">
              {block.stickers.map((s, cellIdx) => (
                // La PRIMA cella in assoluto porta l'anchor della guida, per
                // evidenziare "una figurina" reale nel passo dedicato.
                <StickerCell
                  key={s.stickerId}
                  sticker={s}
                  onTap={tapSticker}
                  onPressStart={handlePointerDown}
                  onPressEnd={handlePointerUp}
                  dataGuide={blockIdx === 0 && cellIdx === 0 ? "guide-first-sticker" : undefined}
                />
              ))}
            </div>
          </div>
        ))}

        {!isGuideDemo && (
          <div className="pt-6 pb-2">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setShowRemoveDialog(true)}
            >
              Rimuovi album dalla collezione
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedSticker} onOpenChange={() => setSelectedSticker(null)}>
        {/* Angoli arrotondati coerenti con gli altri modali (rounded-3xl).
            data-guide sul dialog demo → la guida lo evidenzia con l'istruzione
            "chiudi per continuare" (altrimenti l'utente non saprebbe come uscire). */}
        <DialogContent className="max-w-sm rounded-3xl sm:rounded-3xl" data-guide={isGuideDemo ? "guide-sticker-dialog" : undefined}>
          <DialogHeader>
            <DialogTitle>Figurina {selectedSticker?.code || `#${selectedSticker?.number}`}</DialogTitle>
          </DialogHeader>
          {selectedSticker && (
            <div className="space-y-3">
              <div className={`h-24 rounded-lg flex items-center justify-center text-3xl font-black ${stateColors[(selectedSticker.state ?? "mancante") as StickerState]}`}>
                {selectedSticker.code || selectedSticker.number}
              </div>
              <p className="font-semibold text-foreground text-lg text-center">{selectedSticker.name}</p>
              {selectedSticker.description && <p className="text-sm text-muted-foreground text-center">{selectedSticker.description}</p>}
              <div className="flex gap-2 pt-2">
                {(["posseduta", "doppia", "mancante"] as StickerState[]).map(st => (
                  <Button
                    key={st}
                    size="sm"
                    variant={selectedSticker.state === st ? "default" : "outline"}
                    className={`flex-1 capitalize text-xs ${selectedSticker.state === st ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => {
                      // Album di prova della guida: il dettaglio è read-only.
                      if (!isGuideDemo) updateState.mutate({ albumId, stickerId: selectedSticker.stickerId, data: { state: st } });
                      setSelectedSticker(null);
                    }}
                  >
                    {st}
                  </Button>
                ))}
              </div>
              {/* Solo per le figurine che MANCANO: trova chi le ha come doppia.
                  Apre la ricerca mirata già pre-compilata su questa figurina. */}
              {(selectedSticker.state ?? "mancante") === "mancante" && !isGuideDemo && (
                <Link href={`/match?tab=search&album=${albumId}&sticker=${selectedSticker.stickerId}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setSelectedSticker(null)}
                  >
                    <Search className="h-4 w-4" />
                    Chi ha questo doppione?
                  </Button>
                </Link>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BulkStateDialog
        target={bulkTarget}
        pending={bulkSet.isPending}
        onOpenChange={(open) => { if (!open) setBulkTarget(null); }}
        onConfirm={(target) => { if (!isGuideDemo) bulkSet.mutate({ albumId, data: { state: target } }); else setBulkTarget(null); }}
      />

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i progressi verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeAlbum.mutate({ albumId })}
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
