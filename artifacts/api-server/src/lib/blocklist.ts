// Lista nera email — unica fonte di verità per il blocco "a prova di aggiramento".
//
// Il blocco su users.is_blocked da solo non basta: eliminando la riga utente il
// blocco sparirebbe e l'email tornerebbe libera. Queste funzioni tengono la
// tabella `blocked_emails` allineata al blocco dell'admin e la interrogano in
// login/registrazione. Email sempre confrontata in lower() (case-insensitive),
// coerente con users_email_lower_unique.

/** True se l'email è in lista nera. Null/empty → false (utenti PIN senza email). */
export async function isEmailBlocked(email: string | null | undefined): Promise<boolean> {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const { db } = await import("@workspace/db");
  const { blockedEmailsTable } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const [row] = await db
    .select({ id: blockedEmailsTable.id })
    .from(blockedEmailsTable)
    .where(sql`lower(${blockedEmailsTable.email}) = ${e}`)
    .limit(1);
  return Boolean(row);
}

/** Aggiunge l'email alla lista nera (idempotente). No-op se email vuota. */
export async function blockEmail(email: string | null | undefined, reason?: string): Promise<void> {
  const e = email?.trim().toLowerCase();
  if (!e) return;
  const { db } = await import("@workspace/db");
  const { blockedEmailsTable } = await import("@workspace/db");
  await db
    .insert(blockedEmailsTable)
    .values({ email: e, reason: reason ?? null })
    .onConflictDoNothing();
}

/** Rimuove l'email dalla lista nera (idempotente). No-op se email vuota. */
export async function unblockEmail(email: string | null | undefined): Promise<void> {
  const e = email?.trim().toLowerCase();
  if (!e) return;
  const { db } = await import("@workspace/db");
  const { blockedEmailsTable } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  await db.delete(blockedEmailsTable).where(sql`lower(${blockedEmailsTable.email}) = ${e}`);
}
