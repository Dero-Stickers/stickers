import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Copy, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorRow } from "./errors/ErrorRow";
import { ErrorDetailDialog } from "./errors/ErrorDetailDialog";
import {
  authHeaders,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type ErrorRow as ErrorRowType,
  type ListResponse,
  type Priority,
  type Status,
} from "./errors/types";

export function AdminErrors() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ErrorRowType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (priorityFilter !== "all") qs.set("priority", priorityFilter);
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
  }, [statusFilter, priorityFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.items;
    const q = search.toLowerCase();
    return data.items.filter(
      (r) =>
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

  const updateRow = async (
    id: string,
    body: { status?: Status; priority?: Priority; adminNote?: string },
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
            "Ora incollalo in ChatGPT, Codex o Replit Agent per farti aiutare.",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Segnalazioni
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Errori e problemi segnalati dagli utenti o catturati dall'app.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Totali</p>
            <p className="text-2xl font-bold mt-1">{data?.counts.total ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Nuove</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">
              {data?.counts.new ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critiche</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {data?.counts.critical ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ultimi 7 giorni</p>
            <p className="text-2xl font-bold mt-1">{data?.counts.last7d ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca per pagina, messaggio, nota…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Aggiorna</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center text-xs">
            <span className="text-muted-foreground mr-1">Stato:</span>
            {(["all", "new", "investigating", "resolved", "ignored"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-full border transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {s === "all" ? "Tutte" : STATUS_LABEL[s as Status]}
                </button>
              ),
            )}
            <span className="text-muted-foreground ml-3 mr-1">Priorità:</span>
            {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  priorityFilter === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {p === "all" ? "Tutte" : PRIORITY_LABEL[p as Priority]}
              </button>
            ))}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-2 bg-primary/10 border border-primary/20 rounded-md px-3 py-2">
              <p className="text-sm">
                <span className="font-semibold">{selectedIds.size}</span> selezionate
              </p>
              <div className="flex gap-2">
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
        </CardContent>
      </Card>

      <Card className="shadow-sm">
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
              Nessuna segnalazione
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tutto sembra funzionare bene 🎉
            </p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <ErrorRow
                key={r.id}
                row={r}
                selected={selectedIds.has(r.id)}
                onToggleSelect={toggleSelect}
                onOpen={setSelected}
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
      />
    </div>
  );
}
