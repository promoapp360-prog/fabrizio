# Architettura

```
src/
  app/(site)/        sito pubblico (server components, dati letti dal DB a ogni richiesta)
  app/t/[token]/     menu + ordine al tavolo da QR
  app/admin/         gestionale (login, reset, (panel)/* sezioni)
  app/api/           API: pubbliche (ordini tavolo, prenotazioni, ordini online) e /api/admin/*
  components/        public/ e admin/ (ResourceManager = CRUD generico)
  lib/               logica: auth, rbac, orders, pricing, availability, settings, notify, storage
  middleware.ts      blocca /admin e /api/admin senza sessione
prisma/schema.prisma schema DB · prisma/seed.ts dati demo
tests/               test logica pura
```

## Sicurezza
- **Autenticazione**: password bcrypt (12 round), policy min 10 caratteri lettere+numeri, JWT HS256 in cookie httpOnly/secure/sameSite, scadenza 12h, utente ricontrollato sul DB a ogni richiesta (disattivazione immediata), reset via token monouso 1h, rate-limit login.
- **Autorizzazione**: `src/lib/rbac.ts` definisce i permessi per ruolo; ogni pagina usa `guard()` e ogni API `requirePermission()` — non basta nascondere i menu.
- **Ordini tavolo**: il tavolo è identificato da un token casuale da 144 bit nel QR, rigenerabile/disattivabile. I prezzi sono sempre ricalcolati sul server. `idempotencyKey` unica impedisce ordini doppi. Cambi di stato con controllo concorrenza (update condizionato) e flusso stati vincolato.
- **Prenotazioni**: transazione `Serializable` + verifica capienza → nessun overbooking da richieste concorrenti.
- **Input**: validazione Zod su tutte le API; header di sicurezza in `next.config.mjs`.
- **Pagamenti**: nessun dato carta memorizzato; solo riferimento esterno Stripe.
- **Registro**: `AuditLog` per login, modifiche, stati ordine, pagamenti, QR, impostazioni.
- **Rate limit** in memoria per istanza: con più istanze sostituire con Redis.

## Prezzi a peso
`priceMode` FIXED / PER_KG / PER_HG / PER_PORTION. L'ordine salva `estimatedCents` (su peso indicativo). La cucina inserisce il peso effettivo per riga → `lineFinalCents`; la sala "Conferma importo" dopo averlo comunicato al cliente → `finalCents`. Il pagamento si può registrare solo dopo la conferma. Statistiche distinguono **valore ordini registrati** e **incassato** (tabella Payment).

## Come estendere (anche con Replit Agent)
- Nuova entità gestibile: modello in `schema.prisma` → voce in `src/lib/resources.ts` → pagina con `<ResourceManager>`.
- Nuovo tipo di sezione homepage: case in `components/public/Sections.tsx` + voce `TYPES` in `admin/(panel)/contenuti/Contenuti.tsx`.
- Nuovo ruolo/permesso: `src/lib/rbac.ts`.
- Multi-ristorante in futuro: aggiungere `restaurantId` ai modelli principali (oggi volutamente single-tenant).
- Tempo reale: oggi polling (4s gestionale, 8s cliente), robusto su qualunque hosting. Sostituibile con SSE/WebSocket.
