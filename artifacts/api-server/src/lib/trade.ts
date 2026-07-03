import { eq, and, inArray } from "drizzle-orm";

export interface TradeStickerDetail {
  id: number;
  albumId: number;
  number: number;
  // Codice STAMPATO (può essere alfanumerico, es. "MEX10"): è ciò che la UI
  // mostra; `number` resta solo posizione/ordinamento. Già required nello
  // schema OpenAPI `Sticker`.
  code: string;
  name: string;
}

export interface TradeAlbumGroup {
  albumId: number;
  albumTitle: string;
  stickers: TradeStickerDetail[];
}

export interface TradeBreakdown {
  give: TradeAlbumGroup[];
  receive: TradeAlbumGroup[];
  totalGive: number;
  totalReceive: number;
}

/**
 * Calcola, per la coppia (meId, otherId), cosa `meId` DÀ (le sue doppie che
 * all'altro mancano) e cosa RICEVE (le doppie dell'altro che a `meId` mancano),
 * su TUTTI gli album in comune (scambi cross-album, indipendenti). Raggruppato
 * per album solo per la UI; lo scambio reale è 1:1.
 *
 * Logica UNICA condivisa tra il dettaglio match (`/matches/:userId`) e la
 * conferma scambio in chat (`/chats/:chatId/trade`): NON duplicarla altrove.
 */
export async function computeTradeBreakdown(meId: number, otherId: number): Promise<TradeBreakdown> {
  const { db } = await import("@workspace/db");
  const { userAlbumsTable, userStickersTable, albumsTable, stickersTable } = await import("@workspace/db");

  const [myAlbumRows, theirAlbumRows] = await Promise.all([
    db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, meId)),
    db.select({ albumId: userAlbumsTable.albumId }).from(userAlbumsTable).where(eq(userAlbumsTable.userId, otherId)),
  ]);

  const theirAlbumIdSet = new Set(theirAlbumRows.map(a => a.albumId));
  const commonAlbumIds = myAlbumRows.map(a => a.albumId).filter(id => theirAlbumIdSet.has(id));
  if (!commonAlbumIds.length) return { give: [], receive: [], totalGive: 0, totalReceive: 0 };

  const [myStickers, theirStickers, commonAlbums, allStickers] = await Promise.all([
    db.select({ stickerId: userStickersTable.stickerId, albumId: userStickersTable.albumId, state: userStickersTable.state })
      .from(userStickersTable)
      .where(and(eq(userStickersTable.userId, meId), inArray(userStickersTable.albumId, commonAlbumIds))),
    db.select({ stickerId: userStickersTable.stickerId, albumId: userStickersTable.albumId, state: userStickersTable.state })
      .from(userStickersTable)
      .where(and(eq(userStickersTable.userId, otherId), inArray(userStickersTable.albumId, commonAlbumIds))),
    db.select().from(albumsTable).where(inArray(albumsTable.id, commonAlbumIds)),
    db.select().from(stickersTable).where(inArray(stickersTable.albumId, commonAlbumIds)),
  ]);

  const stickerMap = new Map<number, TradeStickerDetail>();
  for (const s of allStickers) stickerMap.set(s.id, { id: s.id, albumId: s.albumId, number: s.number, code: s.code ?? "", name: s.name });
  const toDetail = (ids: number[]) =>
    (ids.map(id => stickerMap.get(id)).filter(Boolean) as TradeStickerDetail[]).sort((a, b) => a.number - b.number);

  const give: TradeAlbumGroup[] = [];
  const receive: TradeAlbumGroup[] = [];
  let totalGive = 0;
  let totalReceive = 0;

  for (const albumId of commonAlbumIds) {
    const albumTitle = commonAlbums.find(a => a.id === albumId)?.title ?? `Album #${albumId}`;
    const myDups = new Set(myStickers.filter(s => s.albumId === albumId && s.state === "doppia").map(s => s.stickerId));
    const myMiss = new Set(myStickers.filter(s => s.albumId === albumId && s.state === "mancante").map(s => s.stickerId));
    const theirDups = new Set(theirStickers.filter(s => s.albumId === albumId && s.state === "doppia").map(s => s.stickerId));
    const theirMiss = new Set(theirStickers.filter(s => s.albumId === albumId && s.state === "mancante").map(s => s.stickerId));
    const giveIds = [...myDups].filter(id => theirMiss.has(id));
    const receiveIds = [...theirDups].filter(id => myMiss.has(id));
    if (giveIds.length) { totalGive += giveIds.length; give.push({ albumId, albumTitle, stickers: toDetail(giveIds) }); }
    if (receiveIds.length) { totalReceive += receiveIds.length; receive.push({ albumId, albumTitle, stickers: toDetail(receiveIds) }); }
  }

  return { give, receive, totalGive, totalReceive };
}
