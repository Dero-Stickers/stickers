import { UserProfile, UserProfileDemoStatus } from "@workspace/api-client-react";

export interface MockUserWithPin extends UserProfile {
  pin: string;
  recoveryCode: string;
  securityQuestion: string;
  securityAnswer: string;
}

export const mockUsers: MockUserWithPin[] = [
  {
    id: 1,
    nickname: "mario75",
    pin: "1234",
    cap: "20100",
    area: "Milano Nord",
    isPremium: false,
    demoStatus: "demo_active" as UserProfileDemoStatus,
    demoExpiresAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
    exchangesCompleted: 12,
    isAdmin: false,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    recoveryCode: "STICK-ABCD-1234-EFGH",
    securityQuestion: "Nome del tuo primo animale?",
    securityAnswer: "fido",
  },
  {
    id: 2,
    nickname: "luca_fan",
    pin: "5678",
    cap: "20121",
    area: "Milano Centro",
    isPremium: true,
    demoStatus: "premium" as UserProfileDemoStatus,
    demoExpiresAt: null,
    exchangesCompleted: 45,
    isAdmin: false,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    recoveryCode: "STICK-WXYZ-5678-IJKL",
    securityQuestion: "Città dove sei nato?",
    securityAnswer: "roma",
  },
  {
    id: 3,
    nickname: "giulia_stickers",
    pin: "9999",
    cap: "20135",
    area: "Milano Sud",
    isPremium: false,
    demoStatus: "free" as UserProfileDemoStatus,
    demoExpiresAt: null,
    exchangesCompleted: 5,
    isAdmin: false,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    recoveryCode: "STICK-MNOP-9999-QRST",
    securityQuestion: "Scuola elementare?",
    securityAnswer: "manzoni",
  },
  {
    id: 4,
    nickname: "admin",
    pin: "0000",
    cap: "00000",
    area: "Admin",
    isPremium: true,
    demoStatus: "premium" as UserProfileDemoStatus,
    demoExpiresAt: null,
    exchangesCompleted: 0,
    isAdmin: true,
    createdAt: new Date(Date.now() - 365 * 86400000).toISOString(),
    recoveryCode: "STICK-ADMIN-0000-0000",
    securityQuestion: "Admin",
    securityAnswer: "admin",
  },
  {
    id: 5,
    nickname: "sofia_ro",
    pin: "1111",
    cap: "20151",
    area: "Milano Ovest",
    isPremium: false,
    demoStatus: "demo_expired" as UserProfileDemoStatus,
    demoExpiresAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    exchangesCompleted: 8,
    isAdmin: false,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    recoveryCode: "STICK-UVWX-1111-YZA0",
    securityQuestion: "Colore preferito?",
    securityAnswer: "blu",
  },
];

export const mockCurrentUser = mockUsers[0];
