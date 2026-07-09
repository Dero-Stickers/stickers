// Monitor risorse free tier (compatto, orizzontale, in alto a destra della pagina
// Errori): quanto è pieno il DB (limite Supabase Free 500 MB → sola lettura oltre)
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

  const worst = data.db.level === "red" || data.users.level === "red"
    ? "red"
    : data.db.level === "yellow" || data.users.level === "yellow"
      ? "yellow"
      : "green";

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white shadow-sm px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${LEVEL_COLOR[worst]}`} title={`Stato: ${worst}`} />
        <span className="text-[11px] font-semibold text-foreground leading-tight">SUPABASE<br /><span className="font-normal text-muted-foreground">free tier</span></span>
      </div>
      <div className="border-l pl-3">
        <Metric
          icon={<Database className="h-3 w-3" />}
          label="DB"
          percent={data.db.percent}
          level={data.db.level}
          detail={`${fmtBytes(data.db.usedBytes)}/${fmtBytes(data.db.limitBytes)}`}
        />
      </div>
      <div className="border-l pl-3">
        <Metric
          icon={<Users className="h-3 w-3" />}
          label="Utenti"
          percent={data.users.percent}
          level={data.users.level}
          detail={`${data.users.count}/~${data.users.softLimit}`}
        />
      </div>
      <div className="border-l pl-3 text-[10px] text-muted-foreground/70 leading-tight whitespace-nowrap">
        Latenza<br />{data.latencyMs} ms
      </div>
    </div>
  );
}
