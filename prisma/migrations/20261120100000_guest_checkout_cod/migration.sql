ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Order"
  ADD COLUMN "guestName" TEXT,
  ADD COLUMN "guestEmail" TEXT,
  ADD COLUMN "guestPhone" TEXT,
  ADD COLUMN "guestAccessTokenHash" TEXT;

CREATE UNIQUE INDEX "Order_guestAccessTokenHash_key" ON "Order"("guestAccessTokenHash");

ALTER TABLE "CouponRedemption" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_guest_or_registered_customer_check"
  CHECK (
    "userId" IS NOT NULL OR
    ("guestName" IS NOT NULL AND "guestEmail" IS NOT NULL AND "guestPhone" IS NOT NULL)
  );
