import { Badge } from "@/components/ui/badge";

export type ChatAccess = "none" | "some" | "full";

/**
 * Stato di accesso alle chat di un utente, derivato dai dati DB.
 * UNICA logica condivisa (Utenti + Monetizzazione): non duplicarla altrove.
 */
export function classifyAccess(u: {
  hasAllChats?: boolean | null;
  unlockedChats?: number | null;
}): ChatAccess {
  if (u.hasAllChats) return "full";
  if ((u.unlockedChats ?? 0) > 0) return "some";
  return "none";
}

/**
 * Badge di stato chat — unico stile condiviso in tutta la sezione admin:
 *  - Free      (nessuno sblocco)      → verde
 *  - Alcune·N  (alcune chat sbloccate) → azzurro
 *  - Tutte le chat (sblocco totale)    → giallo
 */
export function ChatAccessBadge({ access, count }: { access: ChatAccess; count?: number }) {
  if (access === "full")
    return <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Tutte le chat</Badge>;
  if (access === "some")
    return <Badge className="bg-sky-100 text-sky-700 border-0 text-xs">Alcune · {count ?? 0}</Badge>;
  return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Free</Badge>;
}
