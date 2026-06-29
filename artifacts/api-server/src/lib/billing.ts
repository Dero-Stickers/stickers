/**
 * Centralina monetizzazione — modello "paga per sbloccare la chat".
 *
 * App gratis e visibile; si paga SOLO per aprire la chat di un match:
 *  - 'single' → sblocca quella singola coppia (riga in `chat_unlocks`)
 *  - 'all'    → sblocca tutte le chat (flag `isPremium` sull'utente)
 *
 * Interruttore master `chat_paywall_enabled` (app_settings): se NON è 'true'
 * il paywall è spento e TUTTE le chat sono gratis (kill-switch sicuro).
 *
 * REGOLA D'ORO: gli sblocchi (`grant*`) si concedono SOLO da server —
 * webhook del pagamento confermato o azione admin. MAI dal client.
 */

export async function isChatPaywallEnabled(): Promise<boolean> {
  const { db } = await import("@workspace/db");
  const { appSettingsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "chat_paywall_enabled"))
    .limit(1);
  return row?.value === "true";
}

/**
 * Può l'utente APRIRE una nuova chat verso `otherUserId`?
 * (Rispondere a una chat già esistente è sempre libero: il gate sta solo
 * sull'apertura, gestita dal chiamante.)
 */
export async function canOpenChat(userId: number, otherUserId: number): Promise<boolean> {
  if (!(await isChatPaywallEnabled())) return true; // paywall off → gratis per tutti
  const { db } = await import("@workspace/db");
  const { usersTable, chatUnlocksTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return false;
  if (user.isPremium) return true; // sblocco "tutte le chat"

  const [unlock] = await db
    .select()
    .from(chatUnlocksTable)
    .where(and(eq(chatUnlocksTable.userId, userId), eq(chatUnlocksTable.otherUserId, otherUserId)))
    .limit(1);
  return !!unlock;
}

/** Sblocca TUTTE le chat per l'utente (acquisto 'all'). Solo lato server. */
export async function grantAllChats(userId: number): Promise<void> {
  const { db } = await import("@workspace/db");
  const { usersTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  await db.update(usersTable).set({ isPremium: true }).where(eq(usersTable.id, userId));
}

/** Sblocca la singola chat (coppia). Idempotente. Solo lato server. */
export async function grantChatUnlock(userId: number, otherUserId: number, paymentId?: number): Promise<void> {
  const { db } = await import("@workspace/db");
  const { chatUnlocksTable } = await import("@workspace/db");
  await db
    .insert(chatUnlocksTable)
    .values({ userId, otherUserId, paymentId: paymentId ?? null })
    .onConflictDoNothing();
}
