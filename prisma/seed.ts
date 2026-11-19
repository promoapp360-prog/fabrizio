/**
 * Seed iniziale. Tutti i contenuti commerciali sono DIMOSTRATIVI (isDemo=true, prefisso [DEMO])
 * e vanno sostituiti dal ristoratore. Nessuna disponibilità o certificazione è dichiarata.
 * Idempotente: può essere rieseguito senza duplicare i dati.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PRODUCT_COPY, SITE_COPY, withoutDemoLabel } from "../src/lib/restaurant-content";
const db = new PrismaClient();

async function main() {
  // Super Admin
  // Super Admin (accesso con sola password). Creato solo se non esiste già.
  const pw = process.env.SEED_ADMIN_PASSWORD;
  if (pw && !(await db.user.findFirst({ where: { role: "SUPER_ADMIN" } })))
    await db.user.create({ data: { name: "Amministratore", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(pw, 12) } });
  else if (!pw) console.warn("SEED_ADMIN_PASSWORD non impostata: aggiungila nei Secrets, poi usa `npm run admin:set` senza argomenti");

  // 14 allergeni Reg. UE 1169/2011
  const AL = [["glutine", "Glutine"], ["crostacei", "Crostacei"], ["uova", "Uova"], ["pesce", "Pesce"], ["arachidi", "Arachidi"], ["soia", "Soia"], ["latte", "Latte"], ["frutta_guscio", "Frutta a guscio"], ["sedano", "Sedano"], ["senape", "Senape"], ["sesamo", "Sesamo"], ["solfiti", "Solfiti"], ["lupini", "Lupini"], ["molluschi", "Molluschi"]];
  for (const [code, name] of AL) await db.allergen.upsert({ where: { code }, update: {}, create: { code, name } });
  const A = Object.fromEntries((await db.allergen.findMany()).map(a => [a.code, a.id]));

  // Allevamento (descrizioni neutre, senza attribuire superiorità)
  const farming = [
    ["grass-fed", "Grass-fed", "Animali alimentati prevalentemente con erba e foraggi. La carne tende ad avere grasso più giallo e gusto più marcato; le caratteristiche variano molto in base a razza, clima e stagione."],
    ["grain-fed", "Grain-fed", "Animali che nell'ultima fase di allevamento ricevono un'alimentazione a base di cereali. Spesso associata a maggiore infiltrazione di grasso e gusto più dolce; durata e composizione della dieta variano tra produttori."],
    ["pascolo", "Pascolo / semibrado", "Animali che trascorrono parte significativa della vita all'aperto. Il termine non implica di per sé una certificazione: va verificato con il fornitore."],
  ];
  for (const [slug, name, description] of farming) await db.farmingMethod.upsert({ where: { slug }, update: {}, create: { slug, name, description } });
  const F = Object.fromEntries((await db.farmingMethod.findMany()).map(f => [f.slug, f.id]));

  // Tagli (informazioni generali, marcati come demo finché il ristoratore non li rivede)
  const cuts: [string, string, string, string, string][] = [
    ["costata", "Costata", "rib", "Taglio della lombata anteriore con osso, ricco di marezzatura.", "Brace o griglia ad alta temperatura, riposo prima del taglio."],
    ["fiorentina", "Fiorentina", "loin", "Taglio con osso a T che comprende filetto e controfiletto.", "Brace viva, cottura al sangue tradizionale."],
    ["tomahawk", "Tomahawk", "rib", "Costata con lungo osso della costola lasciato intero.", "Brace indiretta e scottatura finale."],
    ["ribeye", "Ribeye", "rib", "Costata disossata, nota per il cuore di grasso centrale.", "Griglia o piastra ad alta temperatura."],
    ["filetto", "Filetto", "loin", "Il muscolo più tenero, magro e delicato.", "Cottura breve, al sangue o media."],
    ["controfiletto", "Controfiletto", "loin", "Lombata disossata, equilibrio tra tenerezza e sapore.", "Griglia, piastra, roast-beef."],
    ["picanha", "Picanha", "sirloin", "Copertura della punta di scamone con caratteristico strato di grasso.", "Spiedo o griglia, grasso verso la brace."],
    ["t-bone", "T-Bone", "loin", "Taglio con osso a T e porzione minore di filetto.", "Brace diretta."],
    ["porterhouse", "Porterhouse", "loin", "Simile al T-Bone, con porzione di filetto più ampia.", "Brace diretta, riposo."],
    ["entrecote", "Entrecôte", "rib", "Taglio tra le costole, saporito e marezzato.", "Padella o griglia."],
  ];
  for (const [i, [slug, name, zone, description, cooking]] of cuts.entries())
    await db.cut.upsert({ where: { slug }, update: {}, create: { slug, name, zone, description, cooking, isDemo: true, position: i } });
  const C = Object.fromEntries((await db.cut.findMany()).map(c => [c.slug, c.id]));

  // Razze: SOLO schede informative; available=false finché il ristoratore non conferma.
  const breeds: [string, string, string, string, string?][] = [
    ["wagyu", "Wagyu", "Giappone", "Termine che indica razze bovine giapponesi note per l'elevata infiltrazione di grasso.", "grain-fed"],
    ["kobe", "Kobe", "Giappone (Hyōgo)", "Denominazione protetta per carne di bovini Tajima-gyu allevati nella prefettura di Hyōgo secondo un disciplinare specifico.", "grain-fed"],
    ["black-angus", "Black Angus", "Scozia (origine)", "Razza di origine scozzese diffusa in tutto il mondo, apprezzata per la marezzatura regolare."],
    ["rubia-gallega", "Rubia Gallega", "Spagna (Galizia)", "Razza galiziana spesso proveniente da animali adulti, con gusto intenso.", "pascolo"],
    ["chianina", "Chianina", "Italia (Toscana)", "Razza italiana di grande taglia, tradizionale per la bistecca alla fiorentina."],
    ["fassona", "Fassona", "Italia (Piemonte)", "Razza Piemontese, nota per la carne magra e tenera."],
    ["scottona", "Scottona", "—", "Femmina giovane di bovino che non ha partorito; il termine indica la categoria, non la razza."],
  ];
  for (const [i, [slug, name, country, tasting, farm]] of breeds.entries())
    await db.breed.upsert({ where: { slug }, update: {}, create: { slug, name, country, tasting, farmingMethodId: farm ? F[farm] : null, isDemo: true, available: false, position: i,
      cuts: { create: ["costata", "filetto"].map(c => ({ cutId: C[c] })) } } });
  const B = Object.fromEntries((await db.breed.findMany()).map(b => [b.slug, b.id]));

  // Categorie e piatti DEMO (prezzi non ufficiali, mai ordinabili finché da definire)
  const cats = [["dalla-brace", "Dalla brace"], ["antipasti", "Antipasti"], ["contorni", "Contorni"], ["dolci", "Dolci"], ["vini", "Vini"], ["bevande", "Bevande"]];
  for (const [i, [slug, name]] of cats.entries()) await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, position: i } });
  const K = Object.fromEntries((await db.category.findMany()).map(c => [c.slug, c.id]));
  const prods = [
    { slug: "demo-costata", name: "[DEMO] Costata alla brace", categoryId: K["dalla-brace"], priceMode: "PER_HG", priceCents: 600, estWeightGrams: 1000, hasCooking: true, cutId: C["costata"], description: "Piatto dimostrativo: prezzo e peso fittizi.", position: 0 },
    { slug: "demo-filetto", name: "[DEMO] Filetto", categoryId: K["dalla-brace"], priceMode: "FIXED", priceCents: 2800, hasCooking: true, cutId: C["filetto"], breedId: B["fassona"], description: "Piatto dimostrativo.", position: 1, dailySpecial: true },
    { slug: "demo-picanha", name: "[DEMO] Picanha", categoryId: K["dalla-brace"], priceMode: "PER_KG", priceCents: 5500, estWeightGrams: 350, hasCooking: true, cutId: C["picanha"], description: "Piatto dimostrativo.", position: 2 },
    { slug: "demo-tagliere", name: "[DEMO] Tagliere di salumi", categoryId: K["antipasti"], priceMode: "FIXED", priceCents: 1400, description: "Piatto dimostrativo.", allergens: ["latte"], position: 0 },
    { slug: "demo-patate", name: "[DEMO] Patate al forno", categoryId: K["contorni"], priceMode: "FIXED", priceCents: 500, position: 0 },
    { slug: "demo-tiramisu", name: "[DEMO] Tiramisù", categoryId: K["dolci"], priceMode: "FIXED", priceCents: 600, allergens: ["uova", "latte", "glutine"], position: 0 },
    { slug: "demo-rosso", name: "[DEMO] Vino rosso della casa (calice)", categoryId: K["vini"], priceMode: "FIXED", priceCents: 600, allergens: ["solfiti"], pairing: "Carni alla brace", position: 0 },
    { slug: "demo-acqua", name: "[DEMO] Acqua minerale", categoryId: K["bevande"], priceMode: "FIXED", priceCents: 250, position: 0 },
  ] as const;
  for (const p of prods) {
    const { allergens, ...data } = p as typeof p & { allergens?: string[] };
    const exists = await db.product.findUnique({ where: { slug: p.slug } }); if (exists) continue;
    const created = await db.product.create({ data: { ...data, name: withoutDemoLabel(data.name), ...PRODUCT_COPY[p.slug], priceCents: 0, pricePending: true, isDemo: true } as never });
    if (allergens) await db.productAllergen.createMany({ data: allergens.map(a => ({ productId: created.id, allergenId: A[a] })) });
    if (p.slug === "demo-costata" || p.slug === "demo-filetto")
      await db.optionGroup.create({ data: { productId: created.id, name: "Contorno", minSelect: 0, maxSelect: 1, options: { create: [{ name: "Patate al forno", priceCents: 400 }, { name: "Verdure grigliate", priceCents: 400 }] } } });
  }

  // Tavoli demo con QR
  for (let n = 1; n <= 10; n++) {
    const t = await db.table.upsert({ where: { number: n }, update: {}, create: { number: n, seats: n <= 6 ? 4 : n <= 8 ? 2 : 8, posX: 12 + ((n - 1) % 5) * 19, posY: n <= 5 ? 30 : 70 } });
    if (!(await db.qrCode.findFirst({ where: { tableId: t.id, active: true } }))) await db.qrCode.create({ data: { token: randomBytes(18).toString("base64url"), kind: "TABLE", tableId: t.id } });
  }

  // Turni demo
  if (!(await db.shift.count())) await db.shift.createMany({ data: [
    { name: "Pranzo", weekdays: [2, 3, 4, 5, 6, 0], start: "12:30", end: "15:00", slotMinutes: 30, maxCovers: 40 },
    { name: "Cena", weekdays: [2, 3, 4, 5, 6, 0], start: "19:30", end: "23:30", slotMinutes: 30, maxCovers: 60 },
  ] });

  // Pagine e sezioni CMS
  const pages: [string, string, [string, object][]][] = [
    ["home", "Homepage", [
      ["hero", { restaurantHome: true, title: "VECCIARÍ", subtitle: "MATERA", image: "/api/media/assets/hero-desktop.png", mobileImage: "/api/media/assets/hero-mobile.png" }],
      ["philosophy", SITE_COPY.homePhilosophy],
      ["meats", { title: "Le nostre carni", eyebrow: "Selezioni" }], ["cuts", { title: "I tagli", eyebrow: "Atlante" }], ["menuPreview", { title: "Dalla brace" }],
      ["quality", SITE_COPY.homeQuality],
      ["gallery", { gallery: "home" }], ["reviews", { items: [] }], ["contacts", { title: "Orari e contatti" }],
    ]],
    ["ristorante", "Il ristorante", [["hero", { title: "Il ristorante", subtitle: "La nostra storia" }], ["richtext", SITE_COPY.restaurantStory], ["richtext", SITE_COPY.restaurantRoom], ["richtext", SITE_COPY.restaurantKitchen], ["gallery", { gallery: "ristorante" }]]],
    ["privacy", "Informativa privacy", [["richtext", { body: "[DA COMPLETARE] Inserire l'informativa privacy redatta dal titolare/consulente GDPR: titolare, finalità (prenotazioni, ordini, marketing facoltativo), basi giuridiche, tempi di conservazione, diritti dell'interessato, contatti." }]]],
    ["cookie", "Cookie policy", [["richtext", { body: "[DA COMPLETARE] Cookie tecnici: sessione gestionale, preferenze consenso (localStorage). Cookie statistici: Google Analytics 4, solo previo consenso." }]]],
  ];
  for (const [slug, title, secs] of pages) {
    const exists = await db.page.findUnique({ where: { slug } }); if (exists) continue;
    await db.page.create({ data: { slug, title, sections: { create: secs.map(([type, content], position) => ({ type, content, position })) } } });
  }
  console.log("Seed completato ✓");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
