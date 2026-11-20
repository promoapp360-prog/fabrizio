# Lingue del sito clienti

Il sito dispone dell’italiano e delle 19 lingue richieste nella fotografia:
spagnolo, portoghese brasiliano, russo, ucraino, coreano, cinese semplificato,
greco, olandese, croato, serbo latino, sloveno, macedone, bosniaco, rumeno,
polacco, ceco, albanese, ebraico e bulgaro.

L’area Admin e l’accesso staff restano in italiano, anche quando il cliente
ha selezionato un’altra lingua. L’autenticazione rimane con sola password.

## Comportamento

- Il selettore è disponibile nella testata pubblica e nel percorso dal QR.
- Il cookie tecnico `vecciari_language` conserva la preferenza per un anno,
  sul solo dominio del sito, con SameSite=Lax e Secure sotto HTTPS.
- Il cambio lingua carica un dizionario pubblico dallo stesso sito e aggiorna
  i contenuti server senza ricaricare integralmente la pagina. Carrello e
  campi già compilati restano nello stato React.
- I contenuti server vengono tradotti prima della serializzazione RSC;
  i contenuti interattivi usano lo stesso dizionario nel contesto React.
  Non si modificano i nodi DOM con servizi di traduzione esterni.
- L’ebraico imposta `lang=he` e `dir=rtl`; email, telefoni e campi numerici
  mantengono la direzione adatta alla lettura.
- Identificatori, prezzi, quantità, indirizzi dei collegamenti, valori dei
  campi, note personali e dati commerciali non vengono riscritti.
- I nomi e le cotture inviati al ristorante restano i valori originali del
  catalogo italiano. Il solo testo mostrato al cliente è tradotto.
- Le notifiche email esistenti non sono state modificate da questo intervento.

## Aggiornare i contenuti

Le traduzioni iniziali includono i testi attuali dell’interfaccia e i contenuti
pubblici attuali del database. Non c’è un servizio esterno che traduce
automaticamente nuovi testi aggiunti in seguito dall’Admin.

Dopo modifiche testuali o nuovi piatti, eseguire nel progetto Vecciarì:

```sh
npm run translations:collect
npm run translations:check
```

La raccolta legge soltanto le risorse pubbliche del catalogo, le sezioni
pubbliche e i gruppi di impostazioni pubblici autorizzati. Non legge clienti,
ordini, prenotazioni, account staff o credenziali.

Se il controllo segnala testi mancanti, aggiornare i dizionari indicati sotto
`src/lib/i18n/dictionaries`, mantenendo esattamente i segnaposti numerati
`{0}`, `{1}` e senza introdurre HTML. Il controllo deve passare per tutte le
19 lingue prima del rilascio. Un testo nuovo non ancora tradotto rimane
leggibile nell’originale italiano, anziché essere inventato o nascosto.

Variare un prezzo non richiede di tradurre di nuovo il testo: importi, quantità
e riferimenti sono valori dinamici, non copie del catalogo.

## Controlli prima della pubblicazione

```sh
npm run translations:check
npm test
npm run build
```

Verificare la pagina pubblicata, non soltanto l’anteprima. La presenza dei file
su GitHub non equivale a una pubblicazione completata dalla piattaforma.
Le traduzioni sono una prima versione e non sostituiscono una revisione
professionale, in particolare per testi legali e informazioni alimentari.
