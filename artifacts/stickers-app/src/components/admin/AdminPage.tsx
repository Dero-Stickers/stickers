import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shell standard di OGNI pagina admin: intestazione FISSA (titolo + azioni) e
 * area contenuti che riempie l'altezza disponibile. Lo scroll vive nel
 * contenuto (AdminTable / AdminScrollArea), non nell'intera pagina — così
 * testata e barra azioni restano sempre visibili.
 */
export function AdminPage({
  title,
  subtitle,
  icon,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    // Su mobile l'intera area contenuti scorre in verticale (overflow-y-auto):
    // quando riepiloghi/avvisi + tabella superano l'altezza dello schermo, si
    // raggiunge tutto scrollando la pagina. Da md in su torna il layout classico
    // admin (min-h-0 + overflow-visible): testata e riepilogo fissi, scorre solo
    // la tabella interna. Comportamento uniforme per TUTTE le sezioni admin.
    <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6 overflow-y-auto md:overflow-visible">
      {/* Su mobile: titolo/sottotitolo CENTRATI; le azioni (se presenti) stanno
          a DESTRA sulla STESSA riga del titolo, in posizione assoluta, così il
          titolo resta perfettamente centrato e intatto. Da md in su: layout
          classico admin (titolo a sinistra, azioni a destra nel flusso). */}
      <div className="relative flex flex-col md:flex-row items-center md:items-start md:justify-between gap-4 shrink-0 text-center md:text-left">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center md:justify-start gap-2">
            {icon}
            {title}
          </h1>
          {subtitle != null && (
            <div className="text-muted-foreground text-sm mt-0.5">{subtitle}</div>
          )}
        </div>
        {actions != null && (
          <div className="absolute right-0 top-0 md:static md:shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Area scrollabile per pagine NON tabellari (form, card, liste custom):
 * solo questo blocco scorre, il resto della pagina resta fisso.
 */
export function AdminScrollArea({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-y-auto pb-1", className)}>{children}</div>
  );
}
