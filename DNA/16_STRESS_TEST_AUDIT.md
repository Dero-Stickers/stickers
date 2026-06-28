# Audit Stress Test — Tenuta su free tier

Eseguito: 28 giugno 2026. Obiettivo: capire **fino a quanti utenti** l'app regge su
**Supabase Free (500 MB) + Render Free** (0.1 CPU, 512 MB, spin-down), senza upgrade
a pagamento, e dove stanno i colli di bottiglia.

## Metodo (sola lettura sui dati reali, dati di test isolati e poi rimossi)
- Generati utenti sintetici (`id ≥ 1.000.000`, nickname `stress_*`) tutti sull'album
  più affollato (caso peggiore per i match), a step 500/1.500/3.000.
- Misurato sul server Supabase: peso DB, righe, tempo query match (`EXPLAIN ANALYZE`),
  più tempo end-to-end via API e prova di concorrenza.
- **Album e figurine reali mai toccati** (checksum verificato uguale prima/dopo).
  Pulizia totale + `VACUUM FULL` → DB tornato a 16 MB. Nessun dato sintetico residuo.

## Numeri misurati

| Utenti | Storage DB | Righe user_stickers | Query match (DB) | API /matches |
|--------|-----------|---------------------|------------------|--------------|
| 500 | 54 MB | 325k | 137 ms | 0,42 s |
| 1.500 | 131 MB | 949k | 328 ms | 0,61 s |
| 3.000 | 241 MB | 1,88 M | ~1,2 s (2,5 s senza indice) | 0,77 s |

- **Storage lineare**: ~**75 KB/utente** con 1 album (624 figurine).
- **Calcolo super-lineare**: ×2 utenti ≈ ×3,6 tempo query.
- **Concorrenza**: 20 richieste match insieme (pool 10) → ~2,3 s ciascuna, **0 errori**.

## I tre muri (arrivano quasi insieme)
1. **Storage** (il primo): `user_stickers` tiene 1 riga per OGNI figurina di ogni album
   aggiunto. 500 MB free → **~6.450 utenti** (1 album) / **~3.200** (2 album). A DB pieno
   le scritture si bloccano.
2. **Calcolo**: la query match aggrega su tutta `user_stickers`. Proiezione: ~3 s a
   5.000 utenti, ~10 s a 10.000 → pagina Match inutilizzabile.
3. **Concorrenza/Realtime**: pool DB diretto = 10 query insieme per istanza; Realtime
   free = 200 chat simultanee / 2M messaggi-mese.

## Soglie operative (free tier)
| Utenti attivi | Esperienza | Note |
|---------------|-----------|------|
| 0 – 2.000 | ✅ fluida (match <0,6 s) | free sufficiente |
| 2.000 – 4.000 | 🟠 match 1–2 s | serve cache/indice (fatto) |
| 3.000 – 6.500 | 🔴 storage pieno / match multi-secondo | qui servirebbe upgrade a pagamento |
| 50.000 | ❌ impossibile come è ora | serve cambio architettura (sotto) |

## Migliorie APPLICATE in questa sessione (gratis, sicure)
- **Indice composto** `user_stickers(sticker_id, state)` (migrazione `0002`): query match
  da Seq Scan a Index Scan, **−42%** misurato. In `schema/user-stickers.ts`.
- **Cache match in memoria** (`api-server/src/lib/matchCache.ts`): le liste best/nearby
  sono cache-ate per utente (TTL 60 s, single-instance), **invalidate** quando l'utente
  cambia figurina/album/zona (`user-albums.ts`, `auth.ts`). Taglia il costo ripetuto e
  protegge dalla concorrenza. Il dettaglio match resta non cache-ato (freschezza).

## Leve rimaste (NON fatte — richiedono intervento profondo, decise a parte)
- **Non salvare le figurine "mancanti"** (mancante = album posseduto + nessuna riga):
  raddoppia/triplica il tetto storage. Tocca query match, vista album e toggle stato →
  refactor del core, da fare con regressione completa. **È la leva #1 per crescere gratis.**
- **Modello a bitmap per album** (~600× meno spazio): abilita 100k+ utenti, ma è un
  ridisegno dati grosso.
- **Pooler Supabase (porta 6543)** invece della diretta (5432) per più connessioni
  insieme — attenzione ai prepared statement con drizzle/pg.

## Decisione
Nessun upgrade a pagamento (scelta utente). Con indice + cache il free regge bene
~2.000 utenti attivi e meglio sotto carico. Per andare oltre, prima la leva
"niente mancanti", poi (eventuale) il pagamento, infine il modello a bitmap per i 50k.
