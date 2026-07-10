import { useState, useMemo } from "react";
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
import { ALBUM_CATEGORIES, DEFAULT_ALBUM_CATEGORY, albumCategoryLabel } from "@workspace/api-client-react";
import type { AlbumCategoryKey } from "@workspace/api-client-react";
import worldCupIcon from "/world-cup.png?url";
import euroCupIcon from "/coppa-europei.png?url";
import scudettoIcon from "/scudetto.svg?url";

// Icona per categoria — stesse immagini della vista utente (AlbumList), per
// coerenza admin/user. La coppa Europei è già ottimizzata (coppa-europei.png).
const CATEGORY_ICON: Record<string, string> = {
  mondiali: worldCupIcon,
  europei: euroCupIcon,
  campionato: scudettoIcon,
};
import { useQueryClient } from "@tanstack/react-query";

// Stile select nativo (coerente con SearchSticker): niente componente shadcn Select.
const CATEGORY_SELECT_CLASS =
  "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50";
import { AlbumStickersManager } from "@/components/admin/AlbumStickersManager";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { SortHeader, type SortDir } from "@/components/admin/SortHeader";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";

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
  const [category, setCategory] = useState<string>(album.category ?? DEFAULT_ALBUM_CATEGORY);

  const updateAlbum = useUpdateAlbum({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ADMIN_ALBUMS_KEY });
        toast({ title: "Album aggiornato" });
      },
    },
  });

  const dirty =
    title.trim().length > 0 &&
    (title.trim() !== album.title || category !== (album.category ?? DEFAULT_ALBUM_CATEGORY));

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">Nome album</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Es. Calciatori 2025-2026" />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground block mb-1">Categoria</label>
        <div className="flex gap-2">
          <select className={CATEGORY_SELECT_CLASS} value={category} onChange={e => setCategory(e.target.value)}>
            {ALBUM_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <Button
            className="bg-primary text-primary-foreground shrink-0"
            disabled={!dirty || updateAlbum.isPending}
            onClick={() => updateAlbum.mutate({ albumId: album.id, data: { title: title.trim(), category } })}
          >
            {updateAlbum.isPending ? "..." : "Salva"}
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

  const { data: albums, isLoading, isFetching } = useListAlbums({ query: { queryKey: ADMIN_ALBUMS_KEY } });
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>(DEFAULT_ALBUM_CATEGORY);
  const [manageAlbum, setManageAlbum] = useState<Album | null>(null);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ADMIN_ALBUMS_KEY });

  // Ordinamento colonne (Titolo / Figurine) — default: ordine originale per id.
  const [sortKey, setSortKey] = useState<"title" | "totalStickers" | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const handleSort = (col: "title" | "totalStickers") =>
    setSortKey(prev => {
      if (prev === col) { setSortDir(d => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("asc");
      return col;
    });
  const sortedAlbums = useMemo(() => {
    const list = [...(albums ?? [])];
    if (!sortKey) return list; // ordine naturale (per id / stagione) se non si ordina
    list.sort((a, b) => sortKey === "totalStickers"
      ? a.totalStickers - b.totalStickers
      : a.title.toLowerCase().localeCompare(b.title.toLowerCase(), "it"));
    return sortDir === "asc" ? list : list.reverse();
  }, [albums, sortKey, sortDir]);

  // Ricerca per titolo + filtro stato (On Line / Off Line) + filtro categoria.
  // Si combinano tra loro.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [catFilter, setCatFilter] = useState<AlbumCategoryKey | "all">("all");

  // Aggiorna + azzera: riporta la tabella allo stato originale (ricarica e
  // pulisce ricerca, tutti i filtri e l'ordinamento).
  const resetAndRefresh = () => {
    setSearch("");
    setStatusFilter("all");
    setCatFilter("all");
    setSortKey(null);
    setSortDir("asc");
    invalidate();
  };

  // Categorie effettivamente presenti tra gli album: i chip categoria compaiono
  // solo se ce n'è più di una (coerente col lato utente). Con una sola categoria
  // il filtro è inutile e la riga resta pulita.
  const presentCategories = useMemo(() => {
    const present = new Set((albums ?? []).map(a => a.category ?? DEFAULT_ALBUM_CATEGORY));
    return ALBUM_CATEGORIES.filter(c => present.has(c.key));
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedAlbums.filter(a => {
      if (statusFilter === "online" && !a.isPublished) return false;
      if (statusFilter === "offline" && a.isPublished) return false;
      if (catFilter !== "all" && (a.category ?? DEFAULT_ALBUM_CATEGORY) !== catFilter) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q);
    });
  }, [sortedAlbums, search, statusFilter, catFilter]);

  const createAlbum = useCreateAlbum({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowCreate(false);
        setNewTitle("");
        setNewCategory(DEFAULT_ALBUM_CATEGORY);
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
          // Su mobile solo l'icona "+" tonda (recupera spazio verticale); da sm in
          // su torna il pulsante con testo "Crea album".
          className="bg-primary text-primary-foreground h-9 w-9 p-0 rounded-full sm:w-auto sm:px-4 sm:rounded-md sm:gap-2"
          onClick={() => { setNewTitle(""); setNewCategory(DEFAULT_ALBUM_CATEGORY); setShowCreate(true); }}
          aria-label="Crea album"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crea album</span>
        </Button>
      }
    >
      <AdminFilterBar<"all" | "online" | "offline">
        search={search}
        onSearch={setSearch}
        filter={statusFilter}
        onFilter={setStatusFilter}
        onRefresh={resetAndRefresh}
        refreshing={isFetching}
        options={[
          ["all", "Tutti"],
          // Su mobile abbreviati (On / Off) per evitare lo scroll orizzontale;
          // da sm in su l'etichetta completa (On Line / Off Line).
          ["online", <><span className="sm:hidden">On</span><span className="hidden sm:inline">On Line</span></>],
          ["offline", <><span className="sm:hidden">Off</span><span className="hidden sm:inline">Off Line</span></>],
        ]}
      />
      {/* Chip categoria su una SECONDA riga sotto i filtri stato: riga propria
          scorrevole (flex-nowrap + overflow-x-auto), stessa altezza h-9 e stesso
          stile degli altri chip. Compaiono solo con più di una categoria. */}
      {presentCategories.length > 1 && (
        <div className="shrink-0 w-full flex flex-nowrap items-center gap-1.5 overflow-x-auto touch-pan-x -mt-2">
          <button
            onClick={() => setCatFilter("all")}
            className={`shrink-0 whitespace-nowrap h-9 px-3.5 rounded-xl border text-sm shadow-sm transition-colors ${
              catFilter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white border-border hover:bg-muted"
            }`}
          >
            Tutti
          </button>
          {presentCategories.map(c => (
            <button
              key={c.key}
              onClick={() => setCatFilter(c.key)}
              className={`shrink-0 whitespace-nowrap h-9 px-3.5 rounded-xl border text-sm shadow-sm transition-colors ${
                catFilter === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white border-border hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {/* Spaziatura coerente con Gestione Messaggi: il gap naturale di AdminPage
          tra barra filtri e tabella resta (niente margine negativo). */}
      <div className="flex-1 min-h-0 flex flex-col">
      <AdminTable
        isLoading={isLoading}
        // Su mobile tutte le colonne restano visibili: si scorre in orizzontale
        // (min-width della tabella), coerente con Gestione Utenti.
        className="[&_table]:min-w-[680px]"
        head={
          <>
            <th>
              <SortHeader label="Titolo" col="title" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th>
              <SortHeader label="Figurine" col="totalStickers" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} />
            </th>
            <th>Categoria</th>
            <th>Stato</th>
            <th>Utenti</th>
            <th>Azioni</th>
          </>
        }
      >
        {!isLoading && filteredAlbums.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center text-muted-foreground">
              <div className="py-8">Nessun risultato per la ricerca o il filtro</div>
            </td>
          </tr>
        )}
        {filteredAlbums.map(album => (
          <tr key={album.id}>
            <td>
              <span className="font-medium text-foreground">{album.title}</span>
            </td>
            <td className="text-center text-foreground">{album.totalStickers}</td>
            <td className="text-muted-foreground whitespace-nowrap">
              <span className="flex items-center justify-center gap-1.5">
                {CATEGORY_ICON[album.category] && <img src={CATEGORY_ICON[album.category]} alt="" className="h-5 w-auto" />}
                {albumCategoryLabel(album.category)}
              </span>
            </td>
            <td className="text-center">
              <Badge className={album.isPublished ? "bg-green-100 text-green-700 border-0" : "bg-orange-100 text-orange-700 border-0"}>
                {album.isPublished ? "On Line" : "Off Line"}
              </Badge>
            </td>
            <td className="text-center text-foreground">{album.userCount ?? 0}</td>
            <td>
              <div className="flex items-center justify-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-8 sm:h-7 px-2 gap-1 text-xs" onClick={() => setManageAlbum(album)}>
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Gestisci</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 sm:h-7 px-2 gap-1 text-xs"
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
            <td colSpan={6} className="text-center text-muted-foreground">
              <div className="py-8">Nessun album. Crea il primo.</div>
            </td>
          </tr>
        )}
      </AdminTable>
      </div>

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
            <div>
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <select className={`${CATEGORY_SELECT_CLASS} mt-1`} value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                {ALBUM_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Annulla</Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground"
                onClick={() => { if (newTitle.trim()) createAlbum.mutate({ data: { title: newTitle.trim(), category: newCategory } }); }}
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
