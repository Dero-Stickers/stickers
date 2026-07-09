// Monitor risorse free tier (compatto, orizzontale, in alto a destra della pagina
// Errori): quanto è pieno il DB (limite Supabase Free 500 MB → sola lettura oltre)
// e la crescita utenti, con semaforo verde/giallo/rosso. Serve a non trovarsi col
// DB pieno all'improvviso. Legge il DB reale → funziona identico in produzione.
import { useGetResources, getGetResourcesQueryKey } from "@workspace/api-client-react";
import { Database, Users } from "lucide-react";

const LEVEL_TEXT: Record<string, string> = {
  green: "text-green-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

function fmtBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(b / (1024 * 1024))} MB`;
}

// Semaforo latenza DB. Soglie ampie per non allarmare inutilmente: in locale il
// valore include il viaggio internet Mac→Supabase (~300ms è normale), in
// produzione è più basso. Verde = ok, giallo = da monitorare, rosso = problema.
function latencyLevel(ms: number): string {
  if (ms > 1500) return "red";
  if (ms >= 500) return "yellow";
  return "green";
}

// Una metrica compatta: icona + label, percentuale colorata, dettaglio minuto.
function Metric({
  icon,
  label,
  percent,
  level,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  percent: number;
  level: string;
  detail: string;
}) {
  return (
    <div className="leading-tight">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">{icon}{label}</span>
        <span className={`text-sm font-semibold ${LEVEL_TEXT[level]}`}>{percent}%</span>
      </div>
      <div className="text-[10px] text-muted-foreground/70">{detail}</div>
    </div>
  );
}

export function ResourceMonitor() {
  // staleTime lungo: il dato cambia lentamente e il backend ha già cache 5 min.
  const { data } = useGetResources({
    query: { queryKey: getGetResourcesQueryKey(), staleTime: 5 * 60 * 1000 },
  });
  if (!data) return null;

  return (
    <div className="rounded-xl border bg-white shadow-sm px-3 py-2">
      {/* Titolo centrato, senza pallino */}
      <p className="text-center text-[11px] font-semibold text-muted-foreground mb-1.5">
        SUPABASE <span className="font-normal">free tier</span>
      </p>
      {/* DB · Utenti · Latenza su UNA riga (scorre se lo spazio manca) */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto">
        <Metric
          icon={<Database className="h-3.5 w-3.5" />}
          label="DB"
          percent={data.db.percent}
          level={data.db.level}
          detail={`${fmtBytes(data.db.usedBytes)}/${fmtBytes(data.db.limitBytes)}`}
        />
        <span className="h-6 w-px bg-border shrink-0" />
        <Metric
          icon={<Users className="h-3.5 w-3.5" />}
          label="Utenti"
          percent={data.users.percent}
          level={data.users.level}
          detail={`${data.users.count}/~${data.users.softLimit}`}
        />
        <span className="h-6 w-px bg-border shrink-0" />
        <div className="text-[11px] leading-tight whitespace-nowrap shrink-0">
          <span className="text-muted-foreground">Latenza</span>
          <br />
          <span className={`text-sm font-semibold ${LEVEL_TEXT[latencyLevel(data.latencyMs)]}`}>{data.latencyMs} ms</span>
        </div>
      </div>
    </div>
  );
}
