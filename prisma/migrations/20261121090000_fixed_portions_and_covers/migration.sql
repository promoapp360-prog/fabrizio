-- Additive only: existing orders retain their original weight-based policy and amounts.
ALTER TABLE "Order"
  ADD COLUMN "pricingPolicy" TEXT NOT NULL DEFAULT 'ACTUAL_WEIGHT',
  ADD COLUMN "diningGroupKey" TEXT,
  ADD COLUMN "partySize" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "coverCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "coverUnitCents" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Order_sessionId_diningGroupKey_idx" ON "Order"("sessionId", "diningGroupKey");
