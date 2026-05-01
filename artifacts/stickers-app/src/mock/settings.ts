import { AppSettings, DemoConfig } from "@workspace/api-client-react";

export const mockSettings: AppSettings = {
  supportEmail: "dero975@gmail.com",
  appName: "STICKERs matchbox",
  demoHours: 24,
  privacyPolicyText: "STICKERs matchbox raccoglie solo i dati strettamente necessari al funzionamento del servizio: nickname, CAP, domanda e risposta di sicurezza. Nessun dato personale identificabile viene condiviso con terzi. I dati sono trattati in conformità al GDPR.",
  termsText: "Utilizzando STICKERs matchbox accetti i presenti termini. Il servizio è riservato a persone di età superiore ai 13 anni. Gli scambi di figurine avvengono tra utenti privati. STICKERs non è responsabile per gli scambi effettuati tra utenti.",
  cookiePolicyText: "Questo sito utilizza cookie tecnici necessari al funzionamento. Non vengono utilizzati cookie di profilazione o di terze parti.",
};

export const mockDemoConfig: DemoConfig = {
  demoHours: 24,
  demoEnabled: true,
};
