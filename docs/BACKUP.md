# Backup, ripristino, aggiornamenti, conservazione dati

## Backup
- **Database**: `pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%F).dump` (giornaliero, conservare ≥30 giorni fuori da Replit). Neon/Supabase offrono anche point-in-time recovery.
- **Immagini**: abilitare il versioning sul bucket S3/R2.
- **Codice**: GitHub.

## Ripristino
`pg_restore --clean --no-owner -d "$DATABASE_URL" backup.dump` su un DB vuoto, poi `npm run db:deploy`.

## Aggiornamento in produzione
1. Backup DB. 2. Modifiche in branch → test (`npm test`, `npm run build`). 3. Se cambia lo schema: `npm run db:migrate:dev -- --name x` in sviluppo e commit della migrazione. 4. Merge su `main` → Deploy su Replit (il build applica le migrazioni con `prisma migrate deploy`).

## Conservazione dati (proposta da validare con il consulente privacy)
- Prenotazioni e dati cliente: 24 mesi dall'ultima visita, poi anonimizzazione.
- Consensi: conservati per la durata del trattamento + prova del consenso.
- Ordini/pagamenti: 10 anni (obblighi fiscali) — dati identificativi minimizzati.
- Log attività: 12 mesi.
- Cancellazione su richiesta: Admin › Clienti › Elimina (gli ordini restano senza collegamento al cliente).
