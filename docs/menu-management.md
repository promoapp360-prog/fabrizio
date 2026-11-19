# Gestione Menu

Categorie e prodotti provengono dalle tabelle Prisma esistenti, senza un secondo catalogo.
L'accesso staff rimane esclusivamente con password e permessi esistenti.

## Uso quotidiano

- **Gestione Menu → Categorie**: crea, rinomina, descrivi, carica foto, cambia ordine
  e visibilità. Nascondere una categoria nasconde anche i discendenti e ne impedisce
  gli ordini. Per eliminare una categoria, prima sposta i prodotti e le sottocategorie:
  il server impedisce cancellazioni accidentali dei collegamenti.
- **Gestione Menu → Piatti**: modifica tutti i dati, ingredienti, allergeni, foto,
  prezzo e unità di vendita, disponibilità, canali e ordine. I campi carne sono
  facoltativi; non attribuire razze, origini o frollature non documentate.
- **Specialità della casa** e **Consigliato** mettono in evidenza i piatti nel menu;
  i contrassegni del giorno, fuori menu e stagionale restano separati.
- **Prezzo da definire** nasconde gli importi fittizi e impedisce gli ordini, anche
  tramite API. Disattivalo soltanto quando il ristoratore conferma il prezzo.
- Il contrassegno **Dato dimostrativo** è indipendente dal prezzo: toglierlo dopo
  aver verificato ricetta, foto, allergeni e caratteristiche effettive.
- I prodotti presenti nello storico ordini vengono disattivati, non cancellati.
- Le modifiche appaiono alle nuove aperture del menu; le pagine già aperte si
  aggiornano entro 15 secondi o al ritorno nella scheda. I prezzi vengono sempre
  ricalcolati dal database alla conferma dell'ordine.

## Foto

Le fotografie caricate dall'Admin vengono inviate direttamente all'App Storage
dedicato a questo progetto tramite URL temporaneo. Solo gestori con permesso menu
o contenuti possono caricare; una foto diventa pubblica dopo verifica di formato
e dimensione. Nessun file viene salvato sul disco effimero del server.

I due originali homepage sono archiviati senza modifiche in App Storage:
`assets/hero-desktop.png` e `assets/hero-mobile.png`.
Il CMS conserva i rispettivi URL, modificabili da **Contenuti sito → Hero iniziale**.
Logo e font restano quelli originali del repository. Il simbolo fiamma/spiga e il
nome HTML permettono di non mostrare lo slogan incorporato nel vecchio logo esteso.

Le foto demo sono rappresentative, non attestano i prodotti effettivi del ristorante.
Sono conservate in `assets/menu-*.jpg` e sostituibili dall'Admin.

Riferimenti delle fotografie dimostrative (Unsplash, identificativi originali):
brace `1542365887-1149961dccc7`, antipasti `1754572058122-771d8cb264d2`,
contorni `1633959639799-6d3f66e05710`, dolci `1571877227200-a0d98ea607e9`,
vini `1626203047621-5d7a84c9812b`, bevande `1602904761432-f9ad96133982`.

## Aggiornamento esplicito dei contenuti di sviluppo

`npm run menu:demo` aggiorna soltanto gli esempi originali ancora marcati demo e
aggiunge un esempio dove mancante, rispettando le categorie correnti. Non sovrascrive
prodotti reali. Eseguirlo solo deliberatamente: riporta gli esempi a prezzo da definire.
Non è un comando automatico di avvio o pubblicazione.

La migrazione `menu_management` aggiunge i campi al database senza azzerare dati.
La pubblicazione Replit gestita trasferisce lo schema attraverso il flusso Publish,
non eseguendo migrazioni nel build o nell'avvio.
