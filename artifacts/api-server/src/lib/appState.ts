// Stato globale del sistema Premium/Demo.
//
// L'interruttore vive nella tabella chiave-valore `app_settings`
// (chiave `premium_demo_enabled`). Se la riga manca o e' diversa da "false",
// il sistema e' considerato ATTIVO (comportamento storico preservato).
//
// Quando DISATTIVATO l'app si comporta come se Premium/Demo non esistesse:
// accesso pieno per tutti, nessun blocco chat, nessuna scadenza demo.
export async function isPremiumDemoEnabled(): Promise<boolean> {
  const { db, appSettingsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "premium_demo_enabled"))
    .limit(1);
  return row?.value !== "false";
}
