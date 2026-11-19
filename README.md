# Vecciarì — Grano & Brace · Piattaforma ristorante

Sito pubblico + gestionale per un ristorante di carni alla brace. Un'unica app **Next.js 14 (TypeScript) + PostgreSQL (Prisma) + Tailwind**, portabile su qualsiasi hosting Node (Replit, Vercel, Railway, VPS).

> ⚠️ Tutti i dati commerciali (piatti, prezzi, razze disponibili, testi) sono **dimostrativi**: marcati `[DEMO]` / badge "Demo" e da sostituire dall'admin. Nessuna certificazione o disponibilità è dichiarata.

## Cosa contiene

| Area | Percorso | Stato |
|---|---|---|
| Homepage a sezioni (attiva/disattiva/riordina, bozza→pubblica, anteprima) | `/` · Admin › Contenuti | ✅ |
| Il ristorante, Privacy, Cookie (testi da admin) | `/ristorante` `/privacy` `/cookie` | ✅ |
| Mondo della carne: razze, allevamento, atlante tagli con schema bovino interattivo | `/carne` | ✅ |
| Menu digitale: categorie/sottocategorie, ricerca, filtro allergeni, varianti, cotture, prezzi a peso (kg/hg/porzione) | `/menu` | ✅ |
| Ordine al tavolo da QR (token segreto, sessione tavolo, stato ordine, riordino) | `/t/{token}` | ✅ |
| Prenotazioni con verifica capienza (turni, tavoli, sovrapposizioni, chiusure) | `/prenota` | ✅ |
| Ordini online asporto/consegna (attivabili) | `/ordina` | ✅ (Stripe: predisposto, vedi sotto) |
| Gestionale con ruoli verificati lato server | `/admin` | ✅ |
| Dashboard, Ordini sala, Cucina tablet con stampa comanda, Sala & QR, Prenotazioni (giorno/settimana), Menu, Carne, Contenuti/Media, Promozioni, Clienti/consensi, Magazzino, Statistiche + CSV, Impostazioni, Personale, Registro attività | `/admin/*` | ✅ |

### Integrazioni esterne (mostrate in Admin › Impostazioni › Integrazioni con stato)
- **Storage S3** (R2/S3/Backblaze): upload immagini implementato, attivo appena configuri le variabili.
- **WhatsApp Cloud API** ufficiale: invio implementato, attivo con token. Servono template approvati e consenso.
- **Email SMTP**: le notifiche vengono registrate; l'invio reale richiede `npm i nodemailer` e 10 righe in `src/lib/notify.ts` (segnato nel codice). Finché non è configurato le notifiche risultano `skipped_not_configured` — nessun invio simulato.
- **Stripe**: opzione nascosta finché non abiliti e configuri le chiavi; il checkout va completato in `src/app/api/online-order/route.ts` (punto segnato). I pagamenti manuali (cassa/tavolo) funzionano già; nessun dato carta viene mai salvato.
- **GA4**: caricato solo dopo consenso cookie. **Google Maps**: embed da URL.

## Avvio rapido (locale)

Runtime verificato: Node.js 24, Next.js 16.4.6, React 19 e Prisma 5.22.
Next.js è stato aggiornato su autorizzazione del cliente dopo il blocco di
sicurezza delle versioni 14.2.18 e 14.2.35; sito, design e accesso staff sono
quelli del repository originale.

```bash
cp .env.example .env          # compila DATABASE_URL, AUTH_SECRET, SEED_ADMIN_PASSWORD
npm install
npm run db:setup              # crea la prima migrazione + dati demo + Super Admin
npm run dev                   # http://localhost:3000  ·  gestionale: /admin
npm test                      # test logica (prezzi, capienza, permessi)
```

Dopo `db:setup` **committa la cartella `prisma/migrations`**: da lì in poi ogni modifica allo schema = `npm run db:migrate:dev -- --name descrizione` + commit.

## Replit

1. Replit → **Create Repl → Import from GitHub** → `promoapp360-prog/fabrizio`.
2. Usa esclusivamente il PostgreSQL gestito e dedicato a questo progetto Vecciarì; Replit imposta `DATABASE_URL`. Non collegare database di altri clienti.
3. Tools → **Secrets**: `AUTH_SECRET` (≥32 caratteri), `PUBLIC_BASE_URL` (URL pubblico, serve ai QR), `SEED_ADMIN_PASSWORD`, `TZ=Europe/Rome`, più S3 per le immagini.
4. Shell: `npm install`; se `prisma/migrations` esiste esegui `npm run db:migrate`. Solo sulla prima installazione vuota e senza migrazioni usa `npm run db:setup`. Non resettare database con dati.
5. **Publish** (Autoscale, porta 3000): nel progetto Replit importato il servizio è configurato dall'adattatore in `artifacts/vecciari/.replit-artifact/artifact.toml`. Il build effettivo esegue `npm ci && npm run build` nella cartella del sito; l'avvio esegue `npm run start`. Replit applica lo schema di produzione nel flusso Publish: non aggiungere `db:deploy`, DDL o migrazioni agli hook di build o avvio. Il `.replit` originale del repository è conservato come parte dell'importazione, ma non è la configurazione effettiva di questo progetto.
6. Git panel di Replit per commit/push verso GitHub. Replit Agent può modificare il codice: le istruzioni per lui sono in `docs/ARCHITETTURA.md`.

**Mai** salvare immagini o dati sul filesystem di Replit (è effimero): DB su Postgres, file su S3.

## Checklist dei 12 test richiesti

| # | Scenario | Come verificare |
|---|---|---|
| 1 | Nuovo piatto appare nel menu | Admin › Menu › + Nuovo → `/menu` |
| 2 | Modifica prezzo | Admin › Menu › "Prezzo" sulla riga → `/menu` (lettura diretta dal DB, nessuna cache) |
| 3 | Nuova razza e taglio | Admin › Mondo carne → `/carne` |
| 4 | QR tavolo 5 → ordine associato | Admin › Sala & QR › QR, apri quello del T5 → ordina → Admin › Ordini mostra "Tavolo 5" (il numero viene dal token, non dal client) |
| 5 | Cucina riceve e aggiorna | `/admin/cucina` (polling 4s) → "In preparazione" / "Pronto"; il cliente lo vede in "I miei ordini" |
| 6–7 | Prenotazione ok / rifiutata oltre capienza | `/prenota`; test automatici in `tests/availability.test.ts` |
| 8 | Modifica homepage, colori, testi, immagini | Admin › Contenuti; Admin › Impostazioni › Aspetto |
| 9 | Allergeni e varianti visibili | Scheda piatto nel menu |
| 10 | Integrazioni non configurate segnalate | Admin › Impostazioni › Integrazioni |
| 11 | Accessi non autorizzati bloccati | Utente Cucina → `/admin/clienti` reindirizza; API → 403. Test in `tests/rbac.test.ts` |
| 12 | Persistenza dopo riavvio | Dati su Postgres, media su S3: riavvia il Repl e verifica |

I test 6, 7, 11 e la logica prezzi sono automatizzati; gli altri sono da eseguire a mano sull'app avviata (servono DB e browser).

## Accesso area staff
- Login con **sola password**, nessuna email. Ogni membro dello staff ha una password unica che identifica lui e il suo ruolo.
- Lunghezza minima delle password: **Admin › Impostazioni › Sicurezza** (decide il Super Admin, da 1 a 30 caratteri).
- Il Super Admin crea i membri e ne cambia le password da **Admin › Personale**.
- Impostare o recuperare la password del Super Admin: salva `SEED_ADMIN_PASSWORD` nei Secrets del progetto, poi esegui `npm run admin:set` **senza argomenti**. Non mettere password in comandi, file, log o commit.
- Dopo 8 tentativi errati l'IP viene bloccato per 15 minuti.

## Documentazione
- `docs/ARCHITETTURA.md` — struttura, sicurezza, come estendere
- `docs/API.md` — endpoint
- `docs/BACKUP.md` — backup, ripristino, aggiornamento in produzione, conservazione dati
- `docs/BRAND.md` — analisi asset grafici
