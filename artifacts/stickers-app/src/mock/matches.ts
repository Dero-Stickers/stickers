import { MatchSummary, MatchDetail } from "@workspace/api-client-react";

export const mockMatches: MatchSummary[] = [
  {
    userId: 2,
    nickname: "luca_fan",
    area: "Milano",
    cap: "20100",
    totalExchanges: 15,
    distanceKm: 2.5,
    exchangesCompleted: 45,
    albumsInCommon: 2,
  },
  {
    userId: 3,
    nickname: "giulia_stickers",
    area: "Milano",
    cap: "20100",
    totalExchanges: 8,
    distanceKm: 4.1,
    exchangesCompleted: 3,
    albumsInCommon: 1,
  },
  {
    userId: 5,
    nickname: "sofia_ro",
    area: "Milano",
    cap: "20100",
    totalExchanges: 5,
    distanceKm: 1.2,
    exchangesCompleted: 8,
    albumsInCommon: 1,
  }
];

export const mockMatchDetails: Record<number, MatchDetail> = {
  2: {
    userId: 2,
    nickname: "luca_fan",
    area: "Milano",
    totalExchanges: 15,
    distanceKm: 2.5,
    exchangesCompleted: 45,
    albums: [
      {
        albumId: 1,
        albumTitle: "Calciatori 2024-2025",
        exchangeCount: 10,
        youGive: [
          { id: 2, albumId: 1, number: 2, name: "Lionel Messi" },
          { id: 5, albumId: 1, number: 5, name: "Erling Haaland" },
        ],
        youReceive: [
          { id: 3, albumId: 1, number: 3, name: "Cristiano Ronaldo" },
          { id: 7, albumId: 1, number: 7, name: "Jude Bellingham" },
        ]
      },
      {
        albumId: 2,
        albumTitle: "UEFA Champions League 2024-25",
        exchangeCount: 5,
        youGive: [
          { id: 22, albumId: 2, number: 2, name: "Thibaut Courtois" },
        ],
        youReceive: [
          { id: 24, albumId: 2, number: 4, name: "David Alaba" },
        ]
      }
    ]
  },
  3: {
    userId: 3,
    nickname: "giulia_stickers",
    area: "Milano",
    totalExchanges: 8,
    distanceKm: 4.1,
    exchangesCompleted: 3,
    albums: [
      {
        albumId: 1,
        albumTitle: "Calciatori 2024-2025",
        exchangeCount: 8,
        youGive: [
          { id: 1, albumId: 1, number: 1, name: "Copertina" },
        ],
        youReceive: [
          { id: 10, albumId: 1, number: 10, name: "Robert Lewandowski" },
        ]
      }
    ]
  },
  5: {
    userId: 5,
    nickname: "sofia_ro",
    area: "Milano",
    totalExchanges: 5,
    distanceKm: 1.2,
    exchangesCompleted: 8,
    albums: [
      {
        albumId: 1,
        albumTitle: "Calciatori 2024-2025",
        exchangeCount: 5,
        youGive: [
          { id: 15, albumId: 1, number: 15, name: "Lautaro Martínez" },
        ],
        youReceive: [
          { id: 12, albumId: 1, number: 12, name: "Virgil van Dijk" },
        ]
      }
    ]
  }
};
