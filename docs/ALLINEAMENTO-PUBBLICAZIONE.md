# Allineare anteprima e sito pubblico

La pubblicazione aggiorna il codice. Non sostituisce automaticamente con i dati
dell'anteprima i contenuti già presenti nel database di produzione.

Prima di dichiarare un allineamento concluso:

1. Confrontare **tutto** il catalogo pubblico: prodotti, foto, descrizioni,
   categorie, allergeni, opzioni, razze, tagli e allevamenti.
2. Confrontare tutte le pagine e le sezioni, i media, le promozioni, i contatti,
   gli orari, i turni e le impostazioni pubbliche di prenotazione e ordine.
3. Applicare solo le differenze autorizzate, conservando gli identificativi e
   controllando che nessuno abbia modificato nel frattempo i record interessati.
4. Verificare i file sul dominio pubblico, non soltanto nell'anteprima.
5. Verificare nel browser le pagine pubbliche, il menu e i percorsi tavolo/asporto,
   senza inviare ordini o prenotazioni reali come prova.
6. Se sono cambiati codice o variabili d'ambiente, completare anche la
   pubblicazione dalla piattaforma e controllare il risultato pubblico.

## Controllo ripetibile

Dal progetto Replit, con `PUBLIC_BASE_URL` impostato all'URL pubblico effettivo,
`REPLIT_DEV_DOMAIN` dell'anteprima e il Secret `SEED_ADMIN_PASSWORD` del progetto:

```sh
npm run check:public
```

Il controllo accede tramite l'autenticazione staff con **sola password**, senza
credenziali negli argomenti. Confronta dodici tipi di risorsa pubblica e sei gruppi
di impostazioni, controlla i file utilizzati e restituisce un codice diverso da
zero se rileva differenze o errori. Non stampa password, cookie o valori completi
dei contenuti. Non modifica contenuti né effettua una pubblicazione.

Ordini, prenotazioni, clienti, consensi, password staff, sicurezza, sessioni
tavolo/QR, pagamenti e magazzino non sono oggetto della copia né del confronto.
Gli accessi usano le normali sessioni amministrative, chiuse al termine.

Le bozze non visibili nelle pagine pubbliche non vengono promosse automaticamente.
Record presenti in un solo ambiente vanno esaminati: non devono essere eliminati
o ricreati alla cieca, soprattutto quando hanno collegamenti con dati operativi.

Il controllo è da eseguire nel progetto, non inserire il Secret amministrativo
nelle pipeline esterne o nel codice del browser. Se la password amministrativa
è cambiata, aggiornare il Secret tramite il flusso sicuro del progetto.
