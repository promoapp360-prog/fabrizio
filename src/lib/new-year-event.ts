/** Informazioni confermate per la serata Vecciarì, non per la locandina di Roma. */
export const NEW_YEAR_EVENT = {
  path: "/capodanno-2026",
  contactUrl: "https://vivoeventi.com",
  date: "2026-12-31",
  priceCents: 6000,
  totalSeats: 100,
} as const;

export const newYearMenu = [
  { title: "Entrée di benvenuto", dishes: ["Calice di prosecco, pettolina calda e olive verdi di Cerignola."] },
  { title: "Antipasto", dishes: ["Capocollo di Martina Franca, prosciutto crudo di Parma e salsiccia di Stigliano a punta di coltello, mozzarellina e burratina."] },
  { title: "Primi a scelta", dishes: [
    "Calzone materano con cardoncelli, guanciale locale e stracciatella.",
    "Tagliolino con cozze e pecorino.",
  ] },
  { title: "Secondi a scelta", dishes: [
    "Guancetta di maiale con purè di patate e cicoria campestre saltata in padella.",
    "Braciola alla materana e misticanze dello chef.",
  ] },
  { title: "Brindisi di mezzanotte", dishes: ["Panettone e bottiglia di spumante.", "Lenticchie e cotechino."] },
  { title: "Bevande", dishes: ["Acqua e vino della casa inclusi.", "Altre bevande escluse."] },
] as const;
