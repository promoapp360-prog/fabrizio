// Informazioni del locale confermate dal cliente. Nessun prezzo è impostato qui.
export const RESTAURANT_HOURS = "Da martedì a domenica\nPranzo 12:00–15:00 · Cena 19:00–23:00\nLunedì chiuso";

export const RESTAURANT_CONTACTS = {
  address: "Via XX Settembre 14, 75100 Matera",
  phone: "+39 393 138 0073",
  whatsapp: "393931380073",
};

export const SITE_COPY = {
  homePhilosophy: { eyebrow: "La filosofia", title: "Il fuoco come linguaggio", body: "Vecciarì – Grano & Brace ti aspetta a Matera. Scopri il menu e scegli come vivere il tuo prossimo incontro a tavola.\n\nPer informazioni e prenotazioni puoi chiamarci o scriverci su WhatsApp." },
  homeQuality: { eyebrow: "Il menu", title: "Dalla brace al tavolo", body: "Esplora i tagli e le proposte del menu. Per conoscere disponibilità, preparazioni e ingredienti, chiedi al nostro personale: siamo a disposizione anche per informazioni sugli allergeni." },
  restaurantStory: { eyebrow: "Storia", title: "Vecciarì a Matera", body: "Ci trovi in Via XX Settembre 14, a Matera. Vecciarì – Grano & Brace è il punto di incontro per chi vuole dedicare un momento alla tavola e alla cucina alla brace." },
  restaurantRoom: { eyebrow: "Ambienti", title: "Il tuo prossimo incontro a tavola", body: "Per organizzare la tua visita, conoscere gli orari e prenotare il tuo tavolo, chiamaci al 393 138 0073 oppure contattaci su WhatsApp." },
  restaurantKitchen: { eyebrow: "Cucina", title: "Brace e materia prima", body: "La brace è al centro del nostro menu. Consulta le proposte e il mondo dei tagli; per dettagli sulle preparazioni, disponibilità e allergeni, rivolgiti al personale del ristorante." },
};

export const PRODUCT_COPY: Record<string, { description: string; ingredients: string }> = {
  "demo-costata": { description: "Costata con osso, rosolata sulla brace e servita al taglio, dedicata agli amanti del gusto pieno della carne.", ingredients: "Carne bovina, olio extravergine di oliva, sale, rosmarino." },
  "demo-filetto": { description: "Filetto alla brace dal carattere delicato, accompagnato da erbe aromatiche.", ingredients: "Filetto bovino, olio extravergine di oliva, sale, erbe aromatiche." },
  "demo-picanha": { description: "Picanha alla brace, affettata al momento per valorizzare consistenza e sapore.", ingredients: "Carne bovina, sale." },
  "demo-tagliere": { description: "Una selezione di salumi e formaggi, pensata per aprire la cena con sapori da condividere.", ingredients: "Salumi e formaggi assortiti. Chiedi al personale per composizione e allergeni." },
  "demo-patate": { description: "Spicchi di patate dorati al forno, profumati al rosmarino: un contorno semplice da abbinare alla brace.", ingredients: "Patate, olio extravergine di oliva, rosmarino, sale." },
  "demo-tiramisu": { description: "Crema al mascarpone, savoiardi al caffè e una spolverata di cacao. Un classico finale di cena.", ingredients: "Mascarpone, uova, savoiardi, caffè, zucchero, cacao." },
  "demo-rosso": { description: "Vino rosso al calice. Chiedi al personale per conoscere etichette, annate e disponibilità.", ingredients: "Vino rosso; contiene solfiti." },
  "demo-acqua": { description: "Acqua minerale naturale o frizzante. Chiedi al personale per i formati disponibili.", ingredients: "Acqua minerale." },
};

export function withoutDemoLabel(text: string) {
  return text.replace(/\[DEMO\]\s*/gi, "").trim();
}
