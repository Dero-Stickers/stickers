// Traduzione italiana dei nomi nazione usati come INTESTAZIONI di blocco negli
// album a struttura per-nazione (Mondiali/Europei). Le etichette arrivano dal
// campo `name` delle figurine (suffisso "- Nazione", in inglese): qui si traduce
// SOLO la visualizzazione, i dati nel DB restano invariati. Un'etichetta non in
// mappa (es. sigle FWC/CC o gruppi speciali) resta invariata.
const NATIONS_IT: Record<string, string> = {
  Albania: "Albania",
  Algeria: "Algeria",
  Argentina: "Argentina",
  Australia: "Australia",
  Austria: "Austria",
  Belgium: "Belgio",
  "Bosnia and Herzegovina": "Bosnia ed Erzegovina",
  Brazil: "Brasile",
  Cameroon: "Camerun",
  Canada: "Canada",
  "Cape Verde": "Capo Verde",
  Colombia: "Colombia",
  "Congo DR": "RD del Congo",
  "Costa Rica": "Costa Rica",
  Croatia: "Croazia",
  Curaçao: "Curaçao",
  Czechia: "Cechia",
  "Czech Republic": "Cechia",
  Denmark: "Danimarca",
  Ecuador: "Ecuador",
  Egypt: "Egitto",
  England: "Inghilterra",
  Estonia: "Estonia",
  Finland: "Finlandia",
  France: "Francia",
  Georgia: "Georgia",
  Germany: "Germania",
  Ghana: "Ghana",
  Greece: "Grecia",
  Haiti: "Haiti",
  "Host Countries & Cities": "Paesi e città ospitanti",
  Hungary: "Ungheria",
  Iceland: "Islanda",
  Iran: "Iran",
  Iraq: "Iraq",
  Israel: "Israele",
  Italy: "Italia",
  "Ivory Coast": "Costa d'Avorio",
  Japan: "Giappone",
  Jordan: "Giordania",
  Kazakhstan: "Kazakistan",
  Luxembourg: "Lussemburgo",
  Mexico: "Messico",
  Morocco: "Marocco",
  Netherlands: "Paesi Bassi",
  "New Zealand": "Nuova Zelanda",
  Norway: "Norvegia",
  Panama: "Panama",
  Paraguay: "Paraguay",
  Poland: "Polonia",
  Portugal: "Portogallo",
  Qatar: "Qatar",
  Romania: "Romania",
  "Saudi Arabia": "Arabia Saudita",
  Scotland: "Scozia",
  Senegal: "Senegal",
  Serbia: "Serbia",
  Slovakia: "Slovacchia",
  Slovenia: "Slovenia",
  "South Africa": "Sudafrica",
  "South Korea": "Corea del Sud",
  Spain: "Spagna",
  Sweden: "Svezia",
  Switzerland: "Svizzera",
  Tunisia: "Tunisia",
  Turkey: "Turchia",
  Türkiye: "Turchia",
  Ukraine: "Ucraina",
  Uruguay: "Uruguay",
  USA: "USA",
  Uzbekistan: "Uzbekistan",
  Wales: "Galles",
};

// Voci ordinate per lunghezza decrescente: così "Bosnia and Herzegovina" o
// "Congo DR" vincono su eventuali prefissi più corti nel match iniziale.
const NATION_ENTRIES = Object.entries(NATIONS_IT).sort((a, b) => b[0].length - a[0].length);

/**
 * Traduce in italiano un'etichetta-nazione. Gestisce anche le etichette
 * composte "<Nazione> <modificatore>" (es. "Germany Top XI" → "Germania Top XI"):
 * traduce la parte nazione iniziale e mantiene il resto. Se non riconosce alcuna
 * nazione (es. "FIFA Museum", sigle FWC/CC) lascia l'etichetta invariata.
 */
export function translateNation(label: string): string {
  const exact = NATIONS_IT[label];
  if (exact) return exact;
  for (const [en, it] of NATION_ENTRIES) {
    if (label.startsWith(en + " ")) return it + label.slice(en.length);
  }
  return label;
}
