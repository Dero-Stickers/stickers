import { useGetAppSettings } from "@workspace/api-client-react";

// Email di supporto UNICA dell'app: fonte reale = app_settings.support_email
// (pannello admin → Impostazioni). Il fallback si usa solo se il campo è vuoto
// o le impostazioni non sono ancora caricate. Tutti i punti dell'app che mostrano
// un contatto di supporto devono usare questo hook, così cambiare l'email nel
// pannello la aggiorna ovunque in modo consolidato.
export const SUPPORT_EMAIL_FALLBACK = "stickers@deroarts.com";

export function useSupportEmail(): string {
  const { data: settings } = useGetAppSettings();
  return settings?.supportEmail?.trim() || SUPPORT_EMAIL_FALLBACK;
}
