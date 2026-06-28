-- 0002 — Indice composto per la query dei match
--
-- La query match (give/receive) fa un join su user_stickers.sticker_id
-- filtrando per state ('doppia'/'mancante'). Senza questo indice il planner
-- usa una Seq Scan sull'intera tabella. Misurato durante lo stress test
-- (DNA 15): a 3.000 utenti / 1,88M righe la query passa da ~2,5 s a ~1,4 s
-- (−42%), cambiando il piano da Seq Scan a Index Scan.
-- Additivo e non distruttivo.
CREATE INDEX IF NOT EXISTS user_stickers_sticker_state_idx
  ON public.user_stickers (sticker_id, state);

ANALYZE public.user_stickers;
