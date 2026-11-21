# Regressione browser: ordine → pagamento → WhatsApp

Da `artifacts/vecciari/site` (oppure dalla radice del repository cliente):

```sh
npm ci
npm run test:browser:install
npm run test:browser
```

Serve Chromium con le sue librerie di sistema. In una CI Linux standard usare
`npx playwright install --with-deps chromium`. Non servono Next avviato, database,
Stripe, SMTP, account o variabili segrete.

Su Replit/NixOS si può usare il Chromium già fornito, senza installare un browser:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$(command -v chromium)" npm run test:browser
```

La suite Playwright avvia automaticamente un server Vite locale, solo su
`127.0.0.1:4179`. Non può riutilizzare un server già presente. Importa senza
sostituirli `OnlineOrder`, `TableOrder`, `OrderReceipt`, `ReceiptWhatsApp`,
`PaymentPanel`, i relativi hook e le librerie di pagamento/WhatsApp. Soltanto
il confine Next (`next/navigation`, `next/link`) usa un adattatore browser:
non verifica il rendering server di Next, il database o il webhook Stripe.

Ogni test usa un contesto browser nuovo e dati sintetici. Tutte le API sono
intercettate a livello di contesto, inclusi i POST ordine, coperti e checkout.
Le navigazioni Stripe e WhatsApp, comprese quelle iniziali dei popup, ricevono
HTML locale senza contattare i servizi. Qualsiasi altra API, mutazione o
richiesta esterna viene bloccata e fa fallire il test. Il server non implementa
API applicative, non carica `.env` e non importa codice server/database.

Le verifiche coprono sia asporto online sia tavolo QR:

- nessuna finestra, neanche `about:blank`, prima del checkout o durante PENDING;
- il ritorno `pagamento=verifica` non equivale a PAGATO, anche senza bozza locale;
- la cassa predefinita nel modulo non apre WhatsApp: occorre la scelta esplicita
  nel riepilogo, con testo DA PAGARE;
- soltanto una risposta server PAID apre il riepilogo PAGATO (Stripe);
- polling, effetti React Strict Mode e ricarica non aprono duplicati;
- il collegamento manuale resta disponibile e corrisponde al riepilogo.

Gli orologi browser accelerati fanno passare i veri intervalli di polling senza
attese arbitrarie. Un errore conserva la traccia Playwright in
`generated-artifacts/browser`, esclusa da Git. Eseguire questa suite insieme a
`npm test` e `npx tsc --noEmit` prima di integrare modifiche al percorso ordini.
