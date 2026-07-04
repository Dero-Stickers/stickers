import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { BookOpen, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  useGetUserAlbums,
  useListAlbums,
  useAddAlbumToUser,
  useRemoveAlbumFromUser,
  getGetUserAlbumsQueryKey,
  getListAlbumsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ALBUM_CATEGORIES } from "@workspace/api-client-react";
import { AppHeader } from "@/components/layout/AppHeader";
import worldCupIcon from "/world-cup.png?url";
import euroCupIcon from "/coppa-europei.png?url";
import scudettoIcon from "/scudetto.svg?url";

// Icona per categoria — FONTE UNICA. Aggiungere una categoria = una riga qui
// (chiave = `albums.category`). Categoria senza icona → nessuna icona (ok).
const CATEGORY_ICON: Record<string, string> = {
  mondiali: worldCupIcon,
  europei: euroCupIcon,
  campionato: scudettoIcon,
};

// Ritocco fino per singola icona (le immagini hanno proporzioni molto diverse):
//  - europei: coppa molto slanciata (46×96) → leggera compressione verticale;
//  - mondiali: +10% di grandezza rispetto alle altre.
// Applicato all'ALTEZZA/scala della sola <img>, non tocca il file.
const CATEGORY_ICON_TWEAK: Record<string, string> = {
  europei: "scale-y-90 origin-center",
  mondiali: "scale-110 origin-center",
};

/**
 * Icona categoria dentro un contenitore a LARGHEZZA FISSA: qualunque sia la
 * forma dell'icona (scudetto stretto, coppa slanciata, world-cup largo), occupa
 * sempre la stessa "colonna" e si centra → il testo delle card parte sempre dallo
 * stesso punto e tutte le righe risultano allineate, a prescindere dalla categoria.
 * `h`/`w` = classi Tailwind per altezza icona e larghezza colonna.
 */
function CategoryIcon({ category, h, w }: { category: string; h: string; w: string }) {
  const src = CATEGORY_ICON[category];
  if (!src) return <span className={`${w} shrink-0`} aria-hidden />;
  return (
    <span className={`${w} shrink-0 flex items-center justify-center`}>
      <img src={src} alt="" className={`${h} w-auto ${CATEGORY_ICON_TWEAK[category] ?? ""}`} />
    </span>
  );
}

// Ordine categorie in lista (Mondiali, Europei, Campionato…) = ordine di
// ALBUM_CATEGORIES; a parità di categoria, titolo dal più recente al più vecchio.
const CATEGORY_RANK: Record<string, number> = Object.fromEntries(
  ALBUM_CATEGORIES.map((c, i) => [c.key, i]),
);
const byCategoryThenTitle = (a: { title: string; category: string }, b: { title: string; category: string }) => {
  const ra = CATEGORY_RANK[a.category] ?? 999;
  const rb = CATEGORY_RANK[b.category] ?? 999;
  return ra !== rb ? ra - rb : b.title.localeCompare(a.title);
};

export function AlbumList() {
  const [activeTab, setActiveTab] = useState<"my" | "available">("my");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [removeStep, setRemoveStep] = useState<1 | 2>(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myAlbums, isLoading: loadingMy } = useGetUserAlbums();
  const { data: allAlbums, isLoading: loadingAll } = useListAlbums();

  // Al primo caricamento, se l'utente non ha ancora album, apri direttamente
  // su "Disponibili" (la scheda "I miei album" vuota non è utile come default).
  // Una sola volta: dopo, la scelta manuale del tab resta libera.
  const didInitTab = useRef(false);
  useEffect(() => {
    if (didInitTab.current || myAlbums === undefined) return;
    didInitTab.current = true;
    if ((myAlbums?.length ?? 0) === 0) setActiveTab("available");
  }, [myAlbums]);

  // Derivati memoizzati: Set + sort ricalcolati solo al cambio dati, non a ogni
  // render (es. cambio tab, apertura dialog di rimozione).
  const myAlbumIds = useMemo(() => new Set(myAlbums?.map(a => a.id) ?? []), [myAlbums]);
  const sortedMyAlbums = useMemo(() => [...(myAlbums ?? [])].sort(byCategoryThenTitle), [myAlbums]);
  // Tutti gli album pubblicati: quelli già aggiunti restano visibili ma disabilitati.
  const availableAlbums = useMemo(() => (allAlbums?.filter(a => a.isPublished) ?? []).sort(byCategoryThenTitle), [allAlbums]);

  // Chip-filtro per categoria in "Disponibili": "all" = tutte. Mostro solo i
  // chip delle categorie REALMENTE presenti tra gli album disponibili (scalabile).
  const [catFilter, setCatFilter] = useState<string>("all");
  const presentCategories = useMemo(() => {
    const present = new Set(availableAlbums.map(a => a.category));
    return ALBUM_CATEGORIES.filter(c => present.has(c.key));
  }, [availableAlbums]);
  const filteredAvailable = useMemo(
    () => catFilter === "all" ? availableAlbums : availableAlbums.filter(a => a.category === catFilter),
    [availableAlbums, catFilter],
  );

  // Stesso filtro categoria anche in "I miei album": chip identici e riga bloccata,
  // ma sulle categorie presenti tra gli album POSSEDUTI dall'utente.
  const [myCatFilter, setMyCatFilter] = useState<string>("all");
  const myPresentCategories = useMemo(() => {
    const present = new Set(sortedMyAlbums.map(a => a.category));
    return ALBUM_CATEGORIES.filter(c => present.has(c.key));
  }, [sortedMyAlbums]);
  const filteredMyAlbums = useMemo(
    () => myCatFilter === "all" ? sortedMyAlbums : sortedMyAlbums.filter(a => a.category === myCatFilter),
    [sortedMyAlbums, myCatFilter],
  );

  const addAlbum = useAddAlbumToUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });
        toast({ title: "Album aggiunto", description: "Ora puoi gestire le tue figurine!" });
      },
    },
  });

  const removeAlbum = useRemoveAlbumFromUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUserAlbumsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlbumsQueryKey() });
        setRemoveId(null);
        toast({ title: "Album rimosso" });
      },
    },
  });

  return (
    <div className="flex flex-col h-full">
      <AppHeader />
      <div className="px-4 pt-3 text-center shrink-0">
        <h1 className="text-base font-bold text-foreground">Album</h1>
        <p className="text-muted-foreground text-xs">Gestisci le tue collezioni</p>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("my")}
          >
            I miei album ({myAlbums?.length ?? 0})
          </button>
          <button
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${activeTab === "available" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setActiveTab("available")}
          >
            Disponibili ({availableAlbums.length})
          </button>
        </div>
      </div>

      {/* Fascia filtri FISSA (fuori dallo scroller): i chip categoria restano
          sempre visibili, scorrono solo le card. Mostro i chip del tab attivo. */}
      {activeTab === "my" && myPresentCategories.length > 1 && (
        <div className="px-4 pt-3 shrink-0">
          <div className="flex w-full gap-2">
            <button
              onClick={() => setMyCatFilter("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${myCatFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
            >
              Tutti
            </button>
            {myPresentCategories.map(c => (
              <button
                key={c.key}
                onClick={() => setMyCatFilter(c.key)}
                className={`flex-1 min-w-0 px-1 py-1.5 rounded-full text-xs font-semibold border transition-colors text-center truncate ${myCatFilter === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {activeTab === "available" && presentCategories.length > 1 && (
        // Riga BLOCCATA su una sola linea, mai scrollabile: w-full vincola al
        // contenitore, min-w-0 + truncate sui chip evitano che un'etichetta
        // lunga spinga oltre. "Tutti" (reset) compatto; i master flex-1 uguali.
        <div className="px-4 pt-3 shrink-0">
          <div className="flex w-full gap-2">
            <button
              onClick={() => setCatFilter("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${catFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
            >
              Tutti
            </button>
            {/* Chip senza icona: le sigle categoria vanno tenute compatte per
                stare su una riga sola; le icone restano sulle card album. */}
            {presentCategories.map(c => (
              <button
                key={c.key}
                onClick={() => setCatFilter(c.key)}
                className={`flex-1 min-w-0 px-1 py-1.5 rounded-full text-xs font-semibold border transition-colors text-center truncate ${catFilter === c.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 min-h-0">
        {activeTab === "my" && (
          <div className="grid gap-2 md:grid-cols-2 items-start">
            {loadingMy && [1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            {!loadingMy && (myAlbums?.length ?? 0) === 0 && (
              <div className="text-center py-12 text-muted-foreground md:col-span-2">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album aggiunto</p>
                <p className="text-sm mt-1">Vai su "Disponibili" per aggiungere il tuo primo album</p>
              </div>
            )}
            {filteredMyAlbums.map(ua => (
              <Card key={ua.id} className="shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-center">
                    {/* py più ampio: card alte e spaziose come "Disponibili" pur
                        restando una riga sola (nessun contenuto aggiunto). */}
                    <Link href={`/album/${ua.id}`} className="flex flex-1 min-w-0 items-center gap-3 px-3 py-5 cursor-pointer">
                      <CategoryIcon category={ua.category} h="h-7" w="w-8" />
                      <p className="font-semibold text-foreground truncate min-w-0 flex-1">{ua.title}</p>
                      <span className="text-primary font-bold text-sm shrink-0">{ua.completionPercent}%</span>
                    </Link>
                    <button
                      className="self-stretch flex items-center px-3 text-destructive"
                      onClick={() => { setRemoveStep(1); setRemoveId(ua.id); }}
                      aria-label={`Rimuovi ${ua.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "available" && (
          <div className="grid gap-2 md:grid-cols-2 items-start">
            {loadingAll && [1, 2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            {!loadingAll && filteredAvailable.length === 0 && (
              <div className="text-center py-12 text-muted-foreground md:col-span-2">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nessun album disponibile al momento</p>
              </div>
            )}
            {filteredAvailable.map(album => {
              const added = myAlbumIds.has(album.id);
              return (
              <Card key={album.id} className={`shadow-sm ${added ? "opacity-60" : ""}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={album.category} h="h-7" w="w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground text-sm truncate">{album.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {album.totalStickers} figurine{added ? " · Già aggiunto" : ""}
                      </p>
                    </div>
                    {added ? (
                      <div
                        className="h-11 w-11 shrink-0 rounded-full p-0 flex items-center justify-center bg-muted text-muted-foreground"
                        aria-label="Già aggiunto"
                        title="Già aggiunto"
                      >
                        <Check className="h-5 w-5" />
                      </div>
                    ) : (
                      <Button
                        aria-label={`Aggiungi ${album.title}`}
                        className="h-11 w-11 shrink-0 rounded-full p-0 bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={addAlbum.isPending}
                        onClick={() => addAlbum.mutate({ albumId: album.id })}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={removeId !== null} onOpenChange={v => { if (!v) { setRemoveId(null); setRemoveStep(1); } }}>
        <AlertDialogContent>
          {removeStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Rimuovere l'album?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tutti i progressi delle figurine per questo album verranno eliminati.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => setRemoveStep(2)}
                >
                  Continua
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Sei davvero sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'operazione è definitiva e non può essere annullata.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => removeId !== null && removeAlbum.mutate({ albumId: removeId })}
                >
                  Sì, rimuovi
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
