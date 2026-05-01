import { Chat, ChatStatus } from "@workspace/api-client-react";

export interface MockMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderNickname: string;
  text: string;
  sentAt: string;
  isRead: boolean;
}

export interface MockChat extends Chat {
  participants: number[];
  participantNames: Record<number, string>;
  messages: MockMessage[];
  hasReport: boolean;
}

export const mockChats: MockChat[] = [
  {
    id: 1,
    otherUserId: 2,
    otherUserNickname: "luca_fan",
    otherUserArea: "Milano",
    status: ChatStatus.active,
    lastMessage: "Ciao! Ho visto che hai Messi, ti andrebbe di scambiarlo con Ronaldo?",
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    participants: [1, 2],
    participantNames: { 1: "mario75", 2: "luca_fan" },
    hasReport: false,
    messages: [
      { id: 1, chatId: 1, senderId: 2, senderNickname: "luca_fan", text: "Ciao! Ho visto che hai Messi, ti andrebbe di scambiarlo con Ronaldo?", sentAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
      { id: 2, chatId: 1, senderId: 1, senderNickname: "mario75", text: "Certo, ce l'ho doppio. Che figurine ti mancano dei Calciatori?", sentAt: new Date(Date.now() - 3300000).toISOString(), isRead: true },
      { id: 3, chatId: 1, senderId: 2, senderNickname: "luca_fan", text: "Mi mancano la 3 e la 7. Ho doppie la 2 e la 5.", sentAt: new Date(Date.now() - 3000000).toISOString(), isRead: true },
      { id: 4, chatId: 1, senderId: 1, senderNickname: "mario75", text: "Perfetto! Ci vediamo a Milano? Sono disponibile nel weekend.", sentAt: new Date(Date.now() - 1800000).toISOString(), isRead: false },
    ],
  },
  {
    id: 2,
    otherUserId: 3,
    otherUserNickname: "giulia_stickers",
    otherUserArea: "Milano",
    status: ChatStatus.active,
    lastMessage: "Perfetto, ci vediamo domani alle 15 in Piazza Duomo.",
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
    unreadCount: 0,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    participants: [1, 3],
    participantNames: { 1: "mario75", 3: "giulia_stickers" },
    hasReport: true,
    messages: [
      { id: 5, chatId: 2, senderId: 3, senderNickname: "giulia_stickers", text: "Ciao, scambi ancora la Copertina?", sentAt: new Date(Date.now() - 86400000).toISOString(), isRead: true },
      { id: 6, chatId: 2, senderId: 1, senderNickname: "mario75", text: "Sì certo, mi manca Lewandowski.", sentAt: new Date(Date.now() - 82800000).toISOString(), isRead: true },
      { id: 7, chatId: 2, senderId: 3, senderNickname: "giulia_stickers", text: "Ho Lewandowski doppio! Domani puoi?", sentAt: new Date(Date.now() - 79200000).toISOString(), isRead: true },
      { id: 8, chatId: 2, senderId: 1, senderNickname: "mario75", text: "Perfetto, ci vediamo domani alle 15 in Piazza Duomo.", sentAt: new Date(Date.now() - 7200000).toISOString(), isRead: true },
    ],
  },
];
