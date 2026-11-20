ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "guestName" TEXT,
  ADD COLUMN IF NOT EXISTS "guestEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "guestPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "guestAccessTokenHash" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_guestAccessTokenHash_key" ON "Order"("guestAccessTokenHash");

ALTER TABLE "CouponRedemption" ALTER COLUMN "userId" DROP NOT NULL;

DO $migrate$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_guest_or_registered_customer_check'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_guest_or_registered_customer_check"
      CHECK (
        "userId" IS NOT NULL OR
        ("guestName" IS NOT NULL AND "guestEmail" IS NOT NULL AND "guestPhone" IS NOT NULL)
      );
  END IF;
END $migrate$;
