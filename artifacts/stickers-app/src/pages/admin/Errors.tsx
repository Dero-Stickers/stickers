import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Search, Trash2, MessageSquarePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorRow } from "./errors/ErrorRow";
import { ErrorDetailDialog } from "./errors/ErrorDetailDialog";
import { AdminPage } from "@/components/admin/AdminPage";
import { ResourceMonitor } from "./errors/ResourceMonitor";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  authHeaders,
  STATUS_LABEL,
  friendlyTitle,
  userLabel,
  type ErrorRow as ErrorRowType,
  type ListResponse,
  type Status,
} from "./errors/types";

// La pagina serve due sezioni distinte tramite la prop `group`:
//  - "auto"   → "Errori ricevuti": crash/errori di sistema (default storico);
//  - "manual" → "Segnalazioni & proposte": bug/contenuti/proposte scritti dagli utenti.
// Stessa tabella e stesso codice: cambia solo il filtro e i testi.
type ErrorsGroup = "auto" | "manual";

const GROUP_UI: Record<ErrorsGroup, { title: string; subtitle: string; empty: string }> = {
  auto: {
    title: "Errori ricevuti",
    subtitle: "Errori e blocchi catturati automaticamente dall'app.",
    empty: "Nessun errore di sistema",
  },
  manual: {
    title: "Segnalazioni & proposte",
    subtitle: "Bug, errori nei contenuti e proposte scritti dagli utenti.",
    empty: "Nessuna segnalazione dagli utenti",
  },
};

export function AdminErrors({ group = "auto" }: { group?: ErrorsGroup }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const ui = GROUP_UI[group];
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ErrorRowType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      qs.set("group", group);
      const res = await fetch(`/api/admin/errors?${qs.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json: ListResponse = await res.json();
      setData(json);
    } catch {
      toast({
        title: "Errore di caricamento",
        description: "Non sono riuscito a caricare le segnalazioni.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, group]);

  // "Aggiorna": ricarica i dati e AZZERA i filtri attivi (ricerca + stato).
  // Se lo stato non era "all", riportarlo ad "all" fa già ripartire il fetch via
  // useEffect; se era già "all", ricarico esplicitamente. La ricerca è client-side
  // → basta svuotarla. Così un solo tap riporta la lista pulita e aggiornata.
  // Aggiorna + azzera: riporta la vista allo stato originale (ricarica dal
  // server e pulisce ricerca e filtro di stato) — coerente con le altre sezioni.
  const resetAndRefresh = () => {
    setSearch("");
    setStatusFilter("all");
    void fetchData();
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (r) =>
        friendlyTitle(r).toLowerCase().includes(q) ||
        userLabel(r).toLowerCase().includes(q) ||
        (r.page ?? "").toLowerCase().includes(q) ||
        (r.messageClean ?? "").toLowerCase().includes(q) ||
        (r.userNote ?? "").toLowerCase().includes(q) ||
        r.errorType.toLowerCase().includes(q),
    );
  }, [data, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Apre il dettaglio e segna la segnalazione come LETTA: se era "new" la porta
  // a "investigating" (presa in carico) → il badge verde "New" sparisce.
  // Aggiornamento ottimistico locale + PATCH silenzioso, senza ricaricare la lista.
  const openRow = (row: ErrorRowType) => {
    setSelected(row);
    if (row.status === "new") {
      setData((prev) =>
        prev
          ? {
              counts: { ...prev.counts, new: Math.max(0, prev.counts.new - 1) },
              items: prev.items.map((it) =>
                it.id === row.id ? { ...it, status: "investigating" as Status } : it,
              ),
            }
          : prev,
      );
      void fetch(`/api/admin/errors/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "investigating" }),
      }).catch(() => {});
    }
  };

  const updateRow = async (
    id: string,
    body: { status?: Status; adminNote?: string },
  ) => {
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      toast({ title: "Aggiornato" });
      void fetchData();
      if (selected?.id === id) setSelected({ ...selected, ...body } as ErrorRowType);
    } catch {
      toast({
        title: "Errore",
        description: "Non sono riuscito ad aggiornare.",
        variant: "destructive",
      });
    }
  };

  // Elimina una o più segnalazioni (smart: singola dal dettaglio o in blocco
  // dalle selezionate). Conferma prima, poi ricarica la lista.
  const deleteReports = async (ids: string[]) => {
    if (!ids.length) return;
    const ok = await confirm({
      title: ids.length === 1 ? "Eliminare la segnalazione?" : `Eliminare ${ids.length} segnalazioni?`,
      description: "L'azione è definitiva e non reversibile.",
      confirmLabel: "Elimina",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/errors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json().catch(() => ({ deleted: ids.length }));
      toast({ title: "Eliminate", description: `${j.deleted ?? ids.length} segnalazioni rimosse.` });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (selected && ids.includes(selected.id)) setSelected(null);
      void fetchData();
    } catch {
      toast({ title: "Errore", description: "Eliminazione non riuscita.", variant: "destructive" });
    }
  };

  // Copia gli errori visibili in un formato OTTIMIZZATO PER DEBUG con un AI
  // (es. Claude Code): errori RAGGRUPPATI per messaggio identico (così un crash
  // che colpisce 5 pagine è una voce sola), ognuno con la posizione precisa nel
  // codice dell'app (file:riga, ripulito da node_modules/vite/localhost) e le
  // pagine/occorrenze impattate. Ordinati per gravità (occorrenze totali).
  const copyAll = async () => {
    if (!filtered.length) {
      toast({ title: "Nessun errore da copiare" });
      return;
    }

    // Estrae i frame del SOLO codice dell'app come "file:riga:col", scartando
    // node_modules/vite/localhost e le query string. Il primo frame utile è la
    // causa più probabile.
    const appFrames = (stack: string | null): string[] => {
      if (!stack) return [];
      return stack
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.includes("/src/") && !l.includes("node_modules"))
        .map((l) => {
          const m = l.match(/\/src\/[^?)\s]+/);
          const path = m ? m[0].replace(/:\d+:\d+.*$/, (s) => s) : l;
          // "at fn (/src/x.tsx:10:5)" → "fn — src/x.tsx:10:5"
          const fnMatch = l.match(/at\s+([^\s(]+)\s*\(/);
          const clean = path.replace(/^\//, "").replace(/\?[tv]=[^:)\s]+/g, "");
          return fnMatch ? `${clean}  (${fnMatch[1]})` : clean;
        })
        .filter((v, i, arr) => arr.indexOf(v) === i) // dedup
        .slice(0, 3);
    };

    // Raggruppa per messaggio d'errore normalizzato: stessi crash → una voce.
    type Group = {
      message: string;
      type: string;
      totalCount: number;
      pages: Set<string>;
      users: Set<string>;
      frames: string[];
      status: string;
    };
    const groups = new Map<string, Group>();
    for (const r of filtered) {
      const key = `${r.errorType}::${r.messageClean ?? friendlyTitle(r)}`;
      const g = groups.get(key) ?? {
        message: r.messageClean ?? friendlyTitle(r),
        type: r.errorType,
        totalCount: 0,
        pages: new Set<string>(),
        users: new Set<string>(),
        frames: appFrames(r.stackTop),
        status: STATUS_LABEL[r.status],
      };
      g.totalCount += r.count;
      if (r.page) g.pages.add(r.page);
      g.users.add(userLabel(r));
      if (!g.frames.length) g.frames = appFrames(r.stackTop);
      groups.set(key, g);
    }
    const sorted = [...groups.values()].sort((a, b) => b.totalCount - a.totalCount);

    const header = [
      `# ERRORI APP STICKER — per debug`,
      `Export: ${new Date().toLocaleString("it-IT")}`,
      `${filtered.length} righe → ${sorted.length} errori distinti` +
        `${statusFilter !== "all" ? ` (filtro stato: ${STATUS_LABEL[statusFilter as Status]})` : ""}` +
        `${search.trim() ? ` (ricerca: "${search.trim()}")` : ""}`,
      ``,
      `Errori raggruppati per messaggio identico, ordinati per occorrenze totali.`,
      `Ogni voce ha la posizione nel codice app (file:riga) e le pagine colpite.`,
      `====================================================`,
    ].join("\n");

    const blocks = sorted.map((g, i) => {
      const pages = [...g.pages].join(", ") || "—";
      const lines = [
        `## ${i + 1}. ${g.message}`,
        `Tipo: ${g.type}  ·  Occorrenze totali: ${g.totalCount}  ·  Stato: ${g.status}`,
        `Pagine colpite: ${pages}`,
        g.frames.length
          ? `Posizione nel codice:\n${g.frames.map((f) => `    → ${f}`).join("\n")}`
          : `Posizione nel codice: (nessun frame app nello stack)`,
      ];
      return lines.join("\n");
    });

    const text = `${header}\n\n${blocks.join("\n\n")}\n`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Segnalazioni copiate",
        description: `${filtered.length} segnalazioni negli appunti, pronte per l'analisi AI.`,
      });
    } catch {
      toast({ title: "Copia non riuscita", variant: "destructive" });
    }
  };

  const generateReport = async (ids: string[]) => {
    if (!ids.length) {
      toast({
        title: "Seleziona almeno una segnalazione",
        description: "Spunta le caselle accanto alle righe da includere.",
      });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/errors/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const j = await res.json();
      try {
        await navigator.clipboard.writeText(j.markdown);
        toast({
          title: "Report copiato",
          description:
            "Ora incollalo nel tuo assistente AI (es. ChatGPT o Codex) per farti aiutare.",
        });
      } catch {
        const w = window.open("", "_blank");
        if (w) {
          const safe = (j.markdown as string).replace(
            /[<&>]/g,
            (c: string) =>
              ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
          );
          w.document.write(
            `<pre style="white-space:pre-wrap;font-family:monospace;padding:1rem">${safe}</pre>`,
          );
        }
      }
    } catch {
      toast({
        title: "Errore",
        description: "Non sono riuscito a generare il report.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminPage
      title={ui.title}
      icon={
        group === "manual"
          ? <MessageSquarePlus className="h-6 w-6 text-primary" />
          : <AlertTriangle className="h-6 w-6 text-amber-500" />
      }
      subtitle={ui.subtitle}
    >
      <div className="shrink-0 space-y-4">
      {group === "auto" && <ResourceMonitor />}
      {/* Stat compatte: label + numero su UNA riga (poco spazio, un numero non
          merita una card alta). Su mobile restano leggibili e in una riga sola. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Totali", value: data?.counts.total, tone: "text-foreground" },
          { label: "Nuove", value: data?.counts.new, tone: "text-green-600" },
          { label: "Ultimi 7gg", value: data?.counts.last7d, tone: "text-foreground" },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-1.5 rounded-xl border bg-white shadow-sm px-3 py-2">
            <span className="text-[11px] text-muted-foreground truncate">{s.label}</span>
            <span className={`text-lg font-bold leading-none ${s.tone}`}>{s.value ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* Filtri SENZA box contenitore (coerente con Messaggi/Utenti): resi
          direttamente, non dentro una Card. */}
      <div className="space-y-3">
          {/* Tutti i filtri su UNA riga: cerca + aggiorna(reset) + chip stato + copia.
              flex-nowrap + overflow-x-auto: se lo spazio manca scorre in orizzontale
              invece di andare a capo, così resta sempre una riga unica. */}
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto text-xs">
            {/* Aggiorna: pulsante TONDO, sola icona, SEMPRE in PRIMA posizione. */}
            <button
              onClick={resetAndRefresh}
              disabled={loading}
              aria-label="Aggiorna e azzera la ricerca"
              title="Aggiorna e azzera la ricerca"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border bg-white text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            {/* Box ricerca corto e bianco, come Gestione Messaggi (riferimento). */}
            <div className="relative w-28 sm:w-44 md:w-52 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-xl border bg-white text-sm shadow-sm"
              />
            </div>
            {/* Copia: solo icona senza contorno (uniforme con le altre sezioni). */}
            <button
              onClick={copyAll}
              disabled={loading || !filtered.length}
              aria-label="Copia tutte le segnalazioni"
              title="Copia tutte le segnalazioni"
              className="ml-auto shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
              <p className="text-sm">
                <span className="font-semibold">{selectedIds.size}</span> selezionate
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Deseleziona
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => deleteReports(Array.from(selectedIds))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Elimina
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-primary text-primary-foreground"
                  disabled={generating}
                  onClick={() => generateReport(Array.from(selectedIds))}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {generating ? "Genero…" : "Genera report"}
                </Button>
              </div>
            </div>
          )}
      </div>
      </div>

      <Card className="shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {ui.empty}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {group === "manual" ? "Nessuna segnalazione dagli utenti al momento." : "Tutto sembra funzionare bene 🎉"}
            </p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="flex-1 min-h-0 overflow-auto divide-y divide-border">
            {filtered.map((r) => (
              <ErrorRow
                key={r.id}
                row={r}
                selected={selectedIds.has(r.id)}
                onToggleSelect={toggleSelect}
                onOpen={openRow}
              />
            ))}
          </div>
        )}
      </Card>

      <ErrorDetailDialog
        selected={selected}
        generating={generating}
        onClose={() => setSelected(null)}
        onUpdate={updateRow}
        onGenerateReport={generateReport}
        onDelete={deleteReports}
      />
    </AdminPage>
  );
}
