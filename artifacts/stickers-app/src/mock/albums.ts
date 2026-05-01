import { Album } from "@workspace/api-client-react";

export const mockAlbums: Album[] = [
  {
    id: 1,
    title: "Calciatori 2024-2025",
    description: "La collezione ufficiale dei Calciatori 2024-2025",
    coverUrl: "",
    totalStickers: 672,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 2,
    title: "UEFA Champions League 2024-25",
    description: "Collezione ufficiale UEFA Champions League",
    coverUrl: "",
    totalStickers: 588,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
  {
    id: 3,
    title: "Mondiali Qatar 2022",
    description: "Collezione Mondiali",
    coverUrl: "",
    totalStickers: 670,
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
  },
  {
    id: 4,
    title: "Calciatori 2023-2024",
    description: "Collezione non pubblicata",
    coverUrl: "",
    totalStickers: 672,
    isPublished: false,
    createdAt: new Date(Date.now() - 86400000 * 400).toISOString(),
  }
];
