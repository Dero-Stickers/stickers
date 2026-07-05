// Pagina admin "Donazioni" — l'app è 100% gratuita; l'unico introito è la
// donazione spontanea via Ko-fi. Qui l'owner monitorerà l'andamento (sola
// lettura): totale raccolto, numero donazioni, elenco.
//
// STATO: PREDISPOSTA ma non ancora collegata. Ko-fi invia i dati via webhook
// SOLO quando l'app è online e il webhook è configurato; finché non lo
// colleghiamo, la pagina mostra lo stato "in arrivo" con la struttura pronta.
// Nessuna scrittura: l'app legge soltanto ciò che Ko-fi comunica.

import { Heart, Gift, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPage, AdminScrollArea } from "@/components/admin/AdminPage";
import { AdminTable } from "@/components/admin/AdminTable";

// Riepilogo in cima (per ora a zero: si popolerà con i dati Ko-fi reali).
const SUMMARY = [
  { label: "Totale raccolto", value: "€ 0,00", icon: Heart, color: "text-accent" },
  { label: "Donazioni", value: "0", icon: Gift, color: "text-primary" },
  { label: "Media donazione", value: "€ 0,00", icon: TrendingUp, color: "text-primary" },
  { label: "Ultima", value: "—", icon: Clock, color: "text-muted-foreground" },
];

export function AdminDonations() {
  return (
    <AdminPage title="Donazioni" subtitle="Andamento dei contributi spontanei (Ko-fi)">
      <AdminScrollArea className="space-y-6">
        {/* Riepilogo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUMMARY.map(card => (
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

        {/* Avviso: integrazione Ko-fi da collegare */}
        <Card className="shadow-sm border-accent/30 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-accent" />
              Ko-fi non ancora collegato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              L'app è gratuita: l'unico introito sono le donazioni spontanee.
              Quando collegheremo Ko-fi, qui vedrai in tempo reale ogni
              contributo (importo, nome e messaggio) e l'andamento complessivo.
              La pagina è di sola lettura: nessun pagamento passa dall'app.
            </p>
          </CardContent>
        </Card>

        {/* Elenco donazioni (vuoto finché Ko-fi non è collegato) */}
        <AdminTable
          isLoading={false}
          head={
            <>
              <th>Data</th>
              <th>Da</th>
              <th className="hidden sm:table-cell">Messaggio</th>
              <th>Importo</th>
            </>
          }
        >
          <tr>
            <td colSpan={4} className="text-center text-muted-foreground">
              <div className="py-10">Nessuna donazione ancora.</div>
            </td>
          </tr>
        </AdminTable>
      </AdminScrollArea>
    </AdminPage>
  );
}
