-- Additive, nullable field: existing orders remain unchanged.
ALTER TABLE "Order" ADD COLUMN "returnRequest" JSONB;
