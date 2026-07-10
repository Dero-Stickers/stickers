import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Tabella admin standard — stile coerente centralizzato qui (una sola fonte):
 *  - intestazioni centrate e FISSE (sticky) durante lo scroll
 *  - griglia verticale tra le colonne
 *  - colorazione alternata FISSA delle righe (posizionale, stabile)
 *  - densità compatta (altezza righe ridotta)
 *  - SOLO il corpo tabella scorre; la testata di pagina resta ferma
 *
 * Le pagine passano le intestazioni in `head` (gli `<th>`) e le righe come
 * children (gli `<tr>`), senza ripetere le classi di stile.
 */
export function AdminTable({
  head,
  children,
  isLoading,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        // Mobile: altezza al contenuto (è la PAGINA a scorrere in verticale, vedi
        // AdminPage) così tutte le righe si raggiungono scrollando. Da md in su:
        // flex-1 + scroll interno (solo la tabella scorre, testata fissa).
        "shadow-sm flex flex-col overflow-hidden md:flex-1 md:min-h-0",
        className,
      )}
    >
      {isLoading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 rounded-md" />
          ))}
        </div>
      ) : (
        // touch-pan-x su mobile: il gesto orizzontale scorre SOLO la tabella,
        // quello verticale viene passato alla pagina → niente movimento diagonale
        // "a 360°" (o si scorre in orizzontale, o in verticale). Da md in su la
        // tabella scorre internamente in entrambe le direzioni.
        <div className="overflow-x-auto touch-pan-x md:touch-auto md:flex-1 md:min-h-0 md:overflow-auto">
          <table
            className={cn(
              "w-full border-collapse text-sm",
              // griglia verticale tra le celle
              "[&_th]:border-r [&_td]:border-r [&_th]:border-border/60 [&_td]:border-border/60",
              "[&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0",
              // righe orizzontali + colorazione alternata fissa
              "[&_tbody_tr]:border-b [&_tbody_tr]:border-border/60 [&_tbody_tr:nth-child(even)]:bg-muted/40",
              // densità compatta
              "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-middle",
              // intestazioni: centrate, sticky, sfondo pieno
              "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10 [&_thead_th]:bg-muted",
              "[&_thead_th]:text-center [&_thead_th]:text-xs [&_thead_th]:font-semibold",
              "[&_thead_th]:uppercase [&_thead_th]:tracking-wide [&_thead_th]:text-muted-foreground",
              "[&_thead_th]:border-b [&_thead_th]:border-border",
            )}
          >
            <thead>
              <tr>{head}</tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
