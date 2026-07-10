// Pagina admin "Donazioni" — l'app è 100% gratuita; l'unico introito è la
// donazione spontanea via Ko-fi. Sola lettura: totale raccolto, numero, media,
// elenco. I dati arrivano dal webhook Ko-fi (POST /api/kofi/webhook) salvati in
// DB; qui li leggiamo via GET /api/admin/donations. Nessun pagamento passa
// dall'app. Finché non è arrivata nessuna donazione, mostriamo lo stato "in
// arrivo" (Ko-fi si collega configurando il webhook nel pannello Ko-fi).

import { useMemo, useState } from "react";
import { Heart, Gift, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { SortHeader, type SortDir } from "@/components/admin/SortHeader";
import {
  useGetAdminDonations,
  getGetAdminDonationsQueryKey,
  type AdminDonation,
} from "@workspace/api-client-react";

// Formatta un importo "12.50" + valuta in "€ 12,50" (o simbolo generico).
function money(amount: string | number, currency = "EUR"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

// Data + ora, per il modale di dettaglio (l'elenco mostra solo la data).
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function AdminDonations() {
  // refetchOnMount "always" + niente cache stantia: ogni apertura della pagina
  // ricarica i dati freschi dal server, così una donazione appena arrivata via
  // webhook Ko-fi compare subito senza bisogno di refresh forzato del browser.
  const { data, isLoading, isFetching, refetch } = useGetAdminDonations({
    query: { queryKey: getGetAdminDonationsQueryKey(), refetchOnMount: "always", staleTime: 0 },
  });
  const summary = data?.summary;
  const donations = data?.donations ?? [];
  const currency = summary?.currency ?? "EUR";
  const isEmpty = !isLoading && donations.length === 0;

  // Modale dettaglio: mostra TUTTE le info della donazione (messaggio intero).
  const [selected, setSelected] = useState<AdminDonation | null>(null);

  // Ricerca su nome donatore + messaggio (coerente con le altre sezioni admin).
  const [search, setSearch] = useState("");
  // Aggiorna + azzera: riporta l'elenco allo stato originale (ricarica dal
  // server e pulisce ricerca e ordinamento).
  const resetAndRefresh = () => {
    setSearch("");
    setSortKey(null);
    setSortDir("asc");
    refetch();
  };

  // Ordinamento su Data / Importo (SortHeader consolidato, come Album/Utenti).
  // Default: ordine naturale (dal server: più recenti in alto).
  const [sortKey, setSortKey] = useState<"createdAt" | "amount" | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const handleSort = (col: "createdAt" | "amount") =>
    setSortKey((prev) => {
      if (prev === col) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("asc");
      return col;
    });
  const sortedDonations = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = donations.filter((d) => {
      if (!q) return true;
      return (d.fromName ?? "").toLowerCase().includes(q)
        || (d.message ?? "").toLowerCase().includes(q);
    });
    if (!sortKey) return list; // ordine naturale del server
    list.sort((a, b) =>
      sortKey === "amount"
        ? Number(a.amount) - Number(b.amount)
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return sortDir === "asc" ? list : list.reverse();
  }, [donations, search, sortKey, sortDir]);

  const cards = [
    { label: "Totale raccolto", value: money(summary?.total ?? "0", currency), icon: Heart, color: "text-accent" },
    { label: "Donazioni", value: String(summary?.count ?? 0), icon: Gift, color: "text-primary" },
  ];

  return (
    <AdminPage
      title="Donazioni"
      subtitle={
        <a
          href="https://ko-fi.com/manage/supportreceived?filter=all&purchaseSource=Received&searchKey="
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Vedi le donazioni ricevute su Ko-fi ↗
        </a>
      }
    >
      {/* Riepilogo + avviso: FISSI in cima (shrink-0). Solo l'AdminTable sotto
          scorre (ha già il proprio scroll interno) → coerente con le altre
          pagine admin: testata e riepilogo restano sempre visibili. */}
      <div className="shrink-0 grid grid-cols-2 gap-4">
        {cards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finché non è arrivata alcuna donazione, solo il titolo di stato (la
          spiegazione è stata rimossa per tenere la pagina pulita). */}
      {isEmpty && (
        <Card className="shrink-0 shadow-sm border-accent/30 bg-accent/5">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              In attesa della prima donazione
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Riga filtri coerente con le altre sezioni admin: ricerca (nome o
          messaggio) + pulsante refresh/reset. Le donazioni non hanno stati,
          quindi niente chip (options vuote). */}
      <AdminFilterBar<"all">
        search={search}
        onSearch={setSearch}
        filter="all"
        onFilter={() => {}}
        onRefresh={resetAndRefresh}
        refreshing={isFetching}
        options={[]}
      />

      {/* Elenco donazioni — contenuto celle CENTRATO. Data e Importo sono
          ordinabili (SortHeader). Ogni riga è cliccabile → apre il modale con
          tutte le info (messaggio intero). Solo questa tabella scorre. */}
      <AdminTable
        isLoading={isLoading}
        // Su mobile tutte le colonne restano visibili: si scorre in orizzontale
        // (min-width), coerente con Utenti / Album / Messaggi.
        className="[&_table]:min-w-[640px]"
        head={
          <>
            <th><SortHeader label="Data" col="createdAt" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} /></th>
            <th>Da</th>
            <th>Messaggio</th>
            <th><SortHeader label="Importo" col="amount" sortKey={sortKey ?? ""} sortDir={sortDir} onSort={handleSort} /></th>
            <th>Dettagli</th>
          </>
        }
      >
        {sortedDonations.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-center text-muted-foreground">
              <div className="py-10">Nessuna donazione ancora.</div>
            </td>
          </tr>
        ) : (
          sortedDonations.map((d) => (
            <tr
              key={d.id}
              onClick={() => setSelected(d)}
              className="cursor-pointer hover:bg-muted/60 transition-colors"
              title="Apri dettaglio donazione"
            >
              <td className="whitespace-nowrap text-center text-foreground">{formatDate(d.createdAt)}</td>
              <td className="text-center text-foreground">{d.fromName || "Anonimo"}</td>
              <td className="max-w-xs truncate text-center text-muted-foreground">
                {d.message || "—"}
              </td>
              <td className="whitespace-nowrap text-center font-semibold">{money(d.amount, d.currency)}</td>
              <td className="text-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(d); }}
                  className="inline-flex items-center gap-1.5 text-primary text-xs font-medium hover:underline"
                  title="Apri dettaglio donazione"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Vedi
                </button>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {/* Modale dettaglio donazione — tutte le info per intero, messaggio incluso. */}
      <Dialog open={selected !== null} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              Dettaglio donazione
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Importo</span>
                <span className="font-semibold">{money(selected.amount, selected.currency)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Da</span>
                <span className="font-medium text-right">{selected.fromName || "Anonimo"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data e ora</span>
                <span className="text-right">{formatDateTime(selected.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tipo</span>
                <span className="text-right">{selected.type || "—"}</span>
              </div>
              <div className="pt-1">
                <p className="text-muted-foreground mb-1">Messaggio</p>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 whitespace-pre-wrap break-words text-foreground">
                  {selected.message?.trim() || "Nessun messaggio"}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
