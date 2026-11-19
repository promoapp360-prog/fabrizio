-- Customer-approved opening hours. Preserve existing capacities and slot lengths,
-- and never delete or reschedule reservations already recorded.
UPDATE "Shift"
SET "start" = '12:00', "end" = '15:00',
    "weekdays" = ARRAY[2,3,4,5,6,0]::integer[]
WHERE lower(trim("name")) = 'pranzo';

UPDATE "Shift"
SET "start" = '19:00', "end" = '23:00',
    "weekdays" = ARRAY[2,3,4,5,6,0]::integer[]
WHERE lower(trim("name")) = 'cena';

-- Monday is the weekly closing day, also for any other configured shifts.
UPDATE "Shift" SET "weekdays" = array_remove("weekdays", 1)
WHERE 1 = ANY("weekdays");

INSERT INTO "Setting" ("key", "value", "updatedAt")
VALUES (
  'contacts',
  '{"hours":"Da martedì a domenica\nPranzo 12:00–15:00 · Cena 19:00–23:00\nLunedì chiuso"}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE
SET "value" = "Setting"."value" || EXCLUDED."value",
    "updatedAt" = CURRENT_TIMESTAMP;
