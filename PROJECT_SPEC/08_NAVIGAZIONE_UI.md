# Navigazione e UI

## Footer Mobile (Utente)

| Voce | Icona | Rotta |
|------|-------|-------|
| Home | casa | `/` |
| Album | libro | `/album` |
| Match | scambio | `/match` |
| Profilo | persona | `/profilo` |

## Home — Dashboard Rapida

- Logo/nome app
- Album attivi
- Completamento album principale
- Migliore match
- Match vicino per CAP
- Stato demo/premium
- Bottoni rapidi Album/Match

## Sezione Album

- I miei album
- Album disponibili
- Card album
- Griglia figurine
- Filtro stati

## Sezione Match

- Migliori match
- Vicini a te
- Filtro distanza CAP (slider)
- Dettaglio match multi-album
- Chat integrata

## Sezione Profilo

- Nickname
- CAP
- Area generica
- Stato demo/premium
- Codice di recupero (protetto da PIN)
- Guida onboarding riapribile
- Email di supporto
- Logout

## Onboarding (primo accesso)

Guida con bubble/tooltip che spiega:
1. Gestione album
2. Stati figurine
3. Match
4. Chat
5. Demo premium
6. Privacy CAP

Riapribile dalla sezione Profilo.

## Stile UI

- **Light mode only** (no dark mode)
- Mobile-first
- Sfondo principale chiaro
- Interfaccia pulita, moderna, touch-friendly
- Tono giovane ma non infantile
- Solo le aree con liste lunghe/griglie scrollano
- NO container inutili

## Palette Colori (da logo e screenshot)

| Variabile | Valore | Uso |
|-----------|--------|-----|
| Primary teal | `#1c7a9c` | Sidebar, header, accent |
| Dark navy | `#1a2d45` | Testo principale, sidebar scura |
| Yellow/gold | `#f5a623` | CTA primari, badge, accenti |
| Cream | `#f7f2e8` | Card figurine |
| Light bg | `#f0f4f7` | Sfondo principale |
| White | `#ffffff` | Card, modal |
| Green | `#22c55e` | Stato Posseduta |
| Red | `#ef4444` | Stato Doppia |
