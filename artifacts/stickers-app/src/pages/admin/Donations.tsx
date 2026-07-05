// Pagina admin "Donazioni" — l'app è 100% gratuita; l'unico introito è la
// donazione spontanea via Ko-fi. Sola lettura: totale raccolto, numero, media,
// elenco. I dati arrivano dal webhook Ko-fi (POST /api/kofi/webhook) salvati in
// DB; qui li leggiamo via GET /api/admin/donations. Nessun pagamento passa
// dall'app. Finché non è arrivata nessuna donazione, mostriamo lo stato "in
// arrivo" (Ko-fi si collega configurando il webhook nel pannello Ko-fi).

import { Heart, Gift, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";
import { useGetAdminDonations, getGetAdminDonationsQueryKey } from "@workspace/api-client-react";

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

export function AdminDonations() {
  // refetchOnMount "always" + niente cache stantia: ogni apertura della pagina
  // ricarica i dati freschi dal server, così una donazione appena arrivata via
  // webhook Ko-fi compare subito senza bisogno di refresh forzato del browser.
  const { data, isLoading } = useGetAdminDonations({
    query: { queryKey: getGetAdminDonationsQueryKey(), refetchOnMount: "always", staleTime: 0 },
  });
  const summary = data?.summary;
  const donations = data?.donations ?? [];
  const currency = summary?.currency ?? "EUR";
  const isEmpty = !isLoading && donations.length === 0;

  const cards = [
    { label: "Totale raccolto", value: money(summary?.total ?? "0", currency), icon: Heart, color: "text-accent" },
    { label: "Donazioni", value: String(summary?.count ?? 0), icon: Gift, color: "text-primary" },
    { label: "Media donazione", value: money(summary?.average ?? "0", currency), icon: TrendingUp, color: "text-primary" },
    { label: "Ultima", value: formatDate(summary?.lastAt), icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <AdminPage title="Donazioni" subtitle="Andamento dei contributi spontanei (Ko-fi)">
      {/* Riepilogo + avviso: FISSI in cima (shrink-0). Solo l'AdminTable sotto
          scorre (ha già il proprio scroll interno) → coerente con le altre
          pagine admin: testata e riepilogo restano sempre visibili. */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-4">
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

      {/* Avviso mostrato SOLO finché non è arrivata alcuna donazione: guida al
          collegamento di Ko-fi. Appena arriva il primo contributo, sparisce. */}
      {isEmpty && (
        <Card className="shrink-0 shadow-sm border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              In attesa della prima donazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'app è gratuita: l'unico introito sono le donazioni spontanee.
              Ogni contributo ricevuto tramite Ko-fi comparirà qui in tempo
              reale (importo, nome e messaggio) con l'andamento complessivo.
              La pagina è di sola lettura: nessun pagamento passa dall'app.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Elenco donazioni — contenuto celle CENTRATO (coerente con le
          intestazioni già centrate). Solo questa tabella scorre. */}
      <AdminTable
        isLoading={isLoading}
        head={
          <>
            <th>Data</th>
            <th>Da</th>
            <th className="hidden sm:table-cell">Messaggio</th>
            <th>Importo</th>
          </>
        }
      >
        {donations.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center text-muted-foreground">
              <div className="py-10">Nessuna donazione ancora.</div>
            </td>
          </tr>
        ) : (
          donations.map((d) => (
            <tr key={d.id}>
              <td className="whitespace-nowrap text-center text-foreground">{formatDate(d.createdAt)}</td>
              <td className="text-center text-foreground">{d.fromName || "Anonimo"}</td>
              <td className="hidden sm:table-cell max-w-xs truncate text-center text-muted-foreground">
                {d.message || "—"}
              </td>
              <td className="whitespace-nowrap text-center font-semibold">{money(d.amount, d.currency)}</td>
            </tr>
          ))
        )}
      </AdminTable>
    </AdminPage>
  );
}
