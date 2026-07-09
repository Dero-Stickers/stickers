// Mappa CAP → provincia italiana. Copre tutti i CAP nazionali usando le prime
// 2 cifre (il "compartimento postale", che identifica in modo affidabile la
// provincia/area), con alcune eccezioni a 3 cifre dove due province condividono
// le prime 2 cifre.
//
// Serve SOLO come etichetta leggibile ("Area") lato utente/admin. Il match per
// vicinanza NON usa questa mappa: usa il CAP numerico (vedi routes/matches.ts).
// Se un prefisso non è coperto, deriveArea cade sul fallback generico.

// Eccezioni a 3 cifre: hanno la PRECEDENZA sulla mappa a 2 cifre. Servono dove
// le prime 2 cifre coprono più province (Calabria, alcune isole/aree).
const CAP3: Record<string, string> = {
  "870": "Cosenza", "871": "Cosenza", "875": "Cosenza",
  "880": "Catanzaro", "881": "Catanzaro", "889": "Vibo Valentia",
  "888": "Crotone", "890": "Reggio Calabria", "891": "Reggio Calabria",
  "980": "Messina", "981": "Messina", "982": "Messina",
  "070": "Sassari", "071": "Sassari", "072": "Olbia-Tempio",
  "080": "Nuoro", "081": "Nuoro", "082": "Oristano",
  "090": "Cagliari", "091": "Cagliari", "092": "Carbonia-Iglesias",
  "630": "Ascoli Piceno", "639": "Fermo",
  "760": "Barletta-Andria-Trani",
  "289": "Verbano-Cusio-Ossola", "288": "Verbano-Cusio-Ossola",
  "269": "Lodi", "268": "Lodi", "209": "Monza e Brianza", "208": "Monza e Brianza",
  "479": "Rimini",
};

// Base a 2 cifre: copre l'intera Italia.
const CAP2: Record<string, string> = {
  "00": "Roma", "01": "Viterbo", "02": "Rieti", "03": "Frosinone", "04": "Latina",
  "05": "Terni", "06": "Perugia", "07": "Sassari", "08": "Nuoro", "09": "Cagliari",
  "10": "Torino", "11": "Aosta", "12": "Cuneo", "13": "Vercelli", "14": "Asti",
  "15": "Alessandria", "16": "Genova", "17": "Savona", "18": "Imperia", "19": "La Spezia",
  "20": "Milano", "21": "Varese", "22": "Como", "23": "Sondrio", "24": "Bergamo",
  "25": "Brescia", "26": "Cremona", "27": "Pavia", "28": "Novara", "29": "Piacenza",
  "30": "Venezia", "31": "Treviso", "32": "Belluno", "33": "Udine", "34": "Trieste",
  "35": "Padova", "36": "Vicenza", "37": "Verona", "38": "Trento", "39": "Bolzano",
  "40": "Bologna", "41": "Modena", "42": "Reggio Emilia", "43": "Parma", "44": "Ferrara",
  "45": "Rovigo", "46": "Mantova", "47": "Forlì-Cesena", "48": "Ravenna",
  "50": "Firenze", "51": "Pistoia", "52": "Arezzo", "53": "Siena", "54": "Massa-Carrara",
  "55": "Lucca", "56": "Pisa", "57": "Livorno", "58": "Grosseto", "59": "Prato",
  "60": "Ancona", "61": "Pesaro-Urbino", "62": "Macerata", "63": "Ascoli Piceno",
  "64": "Teramo", "65": "Pescara", "66": "Chieti", "67": "L'Aquila",
  "70": "Bari", "71": "Foggia", "72": "Brindisi", "73": "Lecce", "74": "Taranto",
  "75": "Matera", "76": "Barletta-Andria-Trani",
  "80": "Napoli", "81": "Caserta", "82": "Benevento", "83": "Avellino", "84": "Salerno",
  "85": "Potenza", "86": "Campobasso", "87": "Cosenza", "88": "Catanzaro", "89": "Reggio Calabria",
  "90": "Palermo", "91": "Trapani", "92": "Agrigento", "93": "Caltanissetta", "94": "Enna",
  "95": "Catania", "96": "Siracusa", "97": "Ragusa", "98": "Messina",
};

// Provincia dal CAP: prova l'eccezione a 3 cifre, poi la base a 2 cifre.
// Ritorna null se sconosciuto, così il chiamante decide il fallback finale.
export function provinceFromCap(cap: string): string | null {
  if (!/^\d{5}$/.test(cap)) return null;
  return CAP3[cap.slice(0, 3)] ?? CAP2[cap.slice(0, 2)] ?? null;
}
