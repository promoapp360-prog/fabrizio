-- One-time setup for the requested ordering flow, including the published DB
-- when this release is approved. Never overwrite an administrator's active price.
UPDATE "Product" AS p
SET "priceCents" = initial.cents, "pricePending" = FALSE
FROM (VALUES
  ('Costata alla brace', 'PER_HG', 600),
  ('Filetto', 'FIXED', 2800),
  ('Picanha', 'PER_KG', 5500),
  ('Tagliere di salumi', 'FIXED', 1400),
  ('Patate al forno', 'FIXED', 500),
  ('Tiramisù', 'FIXED', 600),
  ('Vino rosso della casa (calice)', 'FIXED', 600),
  ('Acqua minerale', 'FIXED', 250)
) AS initial(name, mode, cents)
WHERE p."name" = initial.name
  AND p."priceMode"::text = initial.mode
  AND p."pricePending" = TRUE;

UPDATE "Setting"
SET "value" = COALESCE("value", '{}'::jsonb) || '{
  "tableEnabled": true,
  "takeawayEnabled": true,
  "payAtTable": false,
  "payAtCounter": true,
  "stripeEnabled": false
}'::jsonb
WHERE "key" = 'ordering';
