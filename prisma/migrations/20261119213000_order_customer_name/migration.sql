-- Additive only: existing orders and customer records are preserved.
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT;
