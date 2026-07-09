// Monitor risorse free tier (compatto, in alto a destra della pagina Errori):
// mostra quanto è pieno il DB (limite Supabase Free 500 MB → sola lettura oltre)
// e la crescita utenti, con semaforo verde/giallo/rosso. Serve a non trovarsi col
// DB pieno all'improvviso. Legge il DB reale → funziona identico in produzione.
import { useGetResources, getGetResourcesQueryKey } from "@workspace/api-client-react";
import { Database, Users } from "lucide-react";

const LEVEL_COLOR: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};
const LEVEL_TEXT: Record<string, string> = {
  green: "text-green-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(b / (1024 * 1024))} MB`;
}

function Bar({ percent, level }: { percent: number; level: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${LEVEL_COLOR[level] ?? "bg-slate-400"}`}
        style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
      />
    </div>
  );
}

export function ResourceMonitor() {
  // staleTime lungo: il dato cambia lentamente e il backend ha già cache 5 min.
  const { data } = useGetResources({
    query: { queryKey: getGetResourcesQueryKey(), staleTime: 5 * 60 * 1000 },
  });
  if (!data) return null;

  const worst = data.db.level === "red" || data.users.level === "red"
    ? "red"
    : data.db.level === "yellow" || data.users.level === "yellow"
      ? "yellow"
      : "green";

  return (
    <div className="w-52 rounded-xl border bg-white shadow-sm p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-foreground">Risorse free tier</span>
        <span className={`h-2 w-2 rounded-full ${LEVEL_COLOR[worst]}`} title={`Stato: ${worst}`} />
      </div>

      <div className="space-y-2">
        {/* Database */}
        <div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Database className="h-3 w-3" /> Database</span>
            <span className={`font-medium ${LEVEL_TEXT[data.db.level]}`}>{data.db.percent}%</span>
          </div>
          <Bar percent={data.db.percent} level={data.db.level} />
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
            {fmtBytes(data.db.usedBytes)} / {fmtBytes(data.db.limitBytes)}
          </div>
        </div>

        {/* Utenti */}
        <div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Utenti</span>
            <span className={`font-medium ${LEVEL_TEXT[data.users.level]}`}>{data.users.percent}%</span>
          </div>
          <Bar percent={data.users.percent} level={data.users.level} />
          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
            {data.users.count} / ~{data.users.softLimit}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground/70">
        Latenza DB: {data.latencyMs} ms
      </div>
    </div>
  );
}
