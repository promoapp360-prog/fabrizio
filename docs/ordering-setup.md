# Ordini Vecciarì

Il catalogo in Admin è l'unica fonte dei prezzi. I prezzi iniziali sono modificabili.
La migrazione dedicata configura una sola volta prezzi ancora da confermare e
modalità tavolo/asporto anche nel database pubblicato, quando si approva la
pubblicazione di questa versione. Non modifica prezzi già confermati dall'Admin.
Eseguire `npx tsx scripts/configure-ordering.ts` solo per la prima configurazione:
non modifica prezzi già confermati dall'Admin. Non viene eseguito all'avvio.

## Percorso cliente

`/menu` → `/ordina` → Al tavolo / Asporto → carrello → dati e privacy →
pagamento alla cassa → `/ordine/{id}`. Il numero del tavolo deve esistere ed
essere attivo; per l'asporto servono nome di chi ritira e orario. Il QR continua
a identificare il tavolo senza consentirne la sostituzione. Nome, email e
telefono sono richiesti in entrambi i casi. Il nome al ritiro resta associato
all'ordine anche se l'anagrafica viene modificata successivamente.

I prodotti a peso hanno un totale indicativo: il personale inserisce il peso,
conferma l'importo e registra il pagamento. Doppi clic non creano doppi ordini
o doppi pagamenti.

## Email (solo cliente Vecciarì)

Automatismi: ricezione, cambi stato, totale definitivo e pagamento registrato.
SMTP è pronto ma non si dichiarano invii riusciti senza risposta del provider.
Configurare tramite Secrets: SMTP_HOST, SMTP_PORT (587 STARTTLS o 465 TLS),
SMTP_USER, SMTP_PASSWORD, MAIL_FROM. Usare solo un mittente verificato del cliente.
Il collegamento al riepilogo email usa PUBLIC_BASE_URL, da impostare all'URL
pubblico di produzione verificato, mai all'anteprima.

Gli esiti sono visibili in Clienti > Comunicazioni. La Sala può riprovare la
conferma dall'ordine dopo la configurazione; una conferma già inviata non viene
duplicata. Le comunicazioni di servizio non richiedono né attivano marketing.

Per Gmail usare `smtp.gmail.com`, porta `465`, l'indirizzo del cliente come
`SMTP_USER` e `MAIL_FROM`, e una password per le app in `SMTP_PASSWORD`
(richiede verifica in due passaggi Google). Non usare la password ordinaria
né il collegamento Gmail di altri account. Non salvare credenziali nel repository.

`sent` significa destinatario accettato dal server SMTP, non lettura né
consegna garantita in Posta in arrivo. I rifiuti espliciti sono `failed`.
Un'interruzione con esito incerto è `delivery_unknown`: non viene reinviata
automaticamente, per evitare doppioni. Anche `sending` resta bloccato se il
processo termina dopo l'invio: verificare con il provider prima di intervenire.

Verifica manuale autorizzata: `npx tsx scripts/check-order-email.ts DESTINATARIO --send`.
Invia quattro messaggi chiaramente etichettati come prova tecnica (ricezione,
stato pronto, totale definitivo, pagamento), usando gli stessi contenuti e
trasporto dell'app. Registra soltanto notifiche di prova, non ordini o pagamenti,
e verifica un secondo tentativo con la stessa chiave senza reinviare.
Richiedere poi al destinatario la conferma di ricezione, anche controllando Spam.

## Stripe: predisposto, non collegato

Il metodo è visibile ma disabilitato; il server rifiuta richieste STRIPE.
Non vengono usate chiavi di altri progetti e non si registrano pagamenti fittizi.
Per attivarlo successivamente:

1. Collegare esclusivamente Stripe del cliente Vecciarì tramite il flusso autorizzato.
2. Integrare l'SDK ufficiale e i webhook con verifica firma e deduplicazione eventi.
3. Creare Checkout soltanto per un importo definitivo confermato dal server.
4. Registrare PAID solo dal webhook verificato, mai dal ritorno del browser.
5. Gestire annullamento, scadenza, ritentativi e rimborsi senza duplicare l'ordine.
6. Verificare il percorso in test e poi le impostazioni del sito pubblicato.

Non basta attivare l'interruttore in Admin: è intenzionalmente necessario il
completamento dell'integrazione prima di accettare addebiti online.
