import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  EyeOff,
  Search,
  Copy,
  RefreshCw,
  ChevronRight,
  Smartphone,
  Monitor,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Priority = "critical" | "high" | "medium" | "low";
type Status = "new" | "investigating" | "resolved" | "ignored";

interface ErrorRow {
  id: string;
  errorHash: string;
  count: number;
  priority: Priority;
  status: Status;
  page: string | null;
  errorType: string;
  messageClean: string | null;
  stackTop: string | null;
  uaClass: string | null;
  ipPrefix: string | null;
  userId: number | null;
  appVersion: string | null;
  userNote: string | null;
  adminNote: string | null;
  createdAt: string;
  lastSeenAt: string;
}

interface ListResponse {
  counts: { total: number; new: number; critical: number; last7d: number };
  items: ErrorRow[];
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("sticker_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Bassa",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABEL: Record<Status, string> = {
  new: "Nuova",
  investigating: "In analisi",
  resolved: "Risolta",
  ignored: "Ignorata",
};

const STATUS_COLOR: Record<Status, string> = {
  new: "bg-blue-100 text-blue-700",
  investigating: "bg-violet-100 text-violet-700",
  resolved: "bg-green-100 text-green-700",
  ignored: "bg-gray-100 text-gray-600",
};

function DeviceIcon({ ua }: { ua: string | null }) {
  if (!ua) return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
  if (ua.startsWith("mobile"))
    return <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />;
  if (ua === "bot") return <Bug className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Monitor className="h-3.5 w-3.5 text-muted-foreground" />;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ora";
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h fa`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} g fa`;
  return new Date(iso).toLocaleDateString("it-IT");
}

export function AdminErrors() {
  const { toast } = useToast();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ErrorRow | null>(null);
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
    } catch (err) {
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
      if (selected?.id === id) setSelected({ ...selected, ...body } as ErrorRow);
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
        // Fallback: open in new tab
        const w = window.open("", "_blank");
        if (w) {
          w.document.write(
            `<pre style="white-space:pre-wrap;font-family:monospace;padding:1rem">${j.markdown.replace(/[<&>]/g, (c: string) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c)}</pre>`,
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

      {/* Counter cards */}
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

      {/* Filter bar */}
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

      {/* List */}
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
              <div
                key={r.id}
                className="flex items-start gap-3 px-3 py-3 hover:bg-muted/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleSelect(r.id)}
                  className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                  aria-label="Seleziona"
                />
                <button
                  onClick={() => setSelected(r)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge className={`${PRIORITY_COLOR[r.priority]} border text-[10px] px-1.5 py-0`}>
                      {PRIORITY_LABEL[r.priority]}
                    </Badge>
                    <Badge className={`${STATUS_COLOR[r.status]} border-0 text-[10px] px-1.5 py-0`}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    {r.count > 1 && (
                      <Badge className="bg-foreground/10 text-foreground border-0 text-[10px] px-1.5 py-0">
                        ×{r.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-1 break-all">
                    {r.userNote || r.messageClean || "(nessun dettaglio)"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                    <span className="font-mono">{r.page || "—"}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <DeviceIcon ua={r.uaClass} />
                      {r.uaClass ?? "?"}
                    </span>
                    <span>•</span>
                    <span>{timeAgo(r.lastSeenAt)}</span>
                  </div>
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Dettaglio segnalazione
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge className={`${PRIORITY_COLOR[selected.priority]} border`}>
                  {PRIORITY_LABEL[selected.priority]}
                </Badge>
                <Badge className={`${STATUS_COLOR[selected.status]} border-0`}>
                  {STATUS_LABEL[selected.status]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  ×{selected.count} occorrenze
                </Badge>
              </div>

              {selected.userNote && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Cosa ha scritto l'utente
                  </p>
                  <p className="text-sm bg-muted/50 rounded p-2.5 whitespace-pre-wrap">
                    {selected.userNote}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Pagina</p>
                  <p className="font-mono text-xs break-all">{selected.page || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="text-xs">{selected.errorType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispositivo</p>
                  <p className="text-xs">{selected.uaClass ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Versione app</p>
                  <p className="text-xs">{selected.appVersion ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prima volta</p>
                  <p className="text-xs">
                    {new Date(selected.createdAt).toLocaleString("it-IT")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ultima volta</p>
                  <p className="text-xs">
                    {new Date(selected.lastSeenAt).toLocaleString("it-IT")}
                  </p>
                </div>
              </div>

              {selected.messageClean && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Errore tecnico
                  </p>
                  <pre className="text-[11px] bg-muted rounded p-2.5 whitespace-pre-wrap break-all font-mono max-h-32 overflow-y-auto">
                    {selected.messageClean}
                  </pre>
                </div>
              )}

              {selected.stackTop && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Stack
                  </p>
                  <pre className="text-[11px] bg-muted rounded p-2.5 whitespace-pre-wrap break-all font-mono max-h-40 overflow-y-auto">
                    {selected.stackTop}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Cambia priorità
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateRow(selected.id, { priority: p })}
                      className={`px-2.5 py-1 rounded-full border text-xs ${
                        selected.priority === p
                          ? PRIORITY_COLOR[p] + " border"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                  Cambia stato
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateRow(selected.id, { status: s })}
                      className={`px-2.5 py-1 rounded-full border text-xs ${
                        selected.status === s
                          ? STATUS_COLOR[s] + " border-transparent"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => generateReport([selected.id])}
                  disabled={generating}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copia report tecnico
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    updateRow(selected.id, { status: "ignored" })
                  }
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Ignora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
