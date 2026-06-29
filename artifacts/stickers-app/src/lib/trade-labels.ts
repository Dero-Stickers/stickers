/**
 * Etichette UNICHE delle due direzioni di scambio.
 *
 * Regola fissa del progetto: sono SEMPRE "Dai" / "Ricevi" — MAI "Tu dai" /
 * "Tu ricevi". Questa è l'unica fonte: i componenti derivano il testo da qui
 * in base alla direzione, così l'etichetta non può divergere o regredire.
 */
export const TRADE_DIRECTION = {
  give: "Dai",
  receive: "Ricevi",
} as const;

export type TradeDirection = keyof typeof TRADE_DIRECTION;
