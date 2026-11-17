-- Diary: where the invoice goes (goes / stays / recorded in the physical diary)
-- and an optional discount percentage. Existing rows keep working:
-- invoiceAction stays NULL ("Not set") and discountPercent defaults to 0 (no discount).

DO $$ BEGIN
  CREATE TYPE "InvoiceAction" AS ENUM ('goes', 'stays', 'diary');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DiaryEntry" ADD COLUMN IF NOT EXISTS "invoiceAction" "InvoiceAction";
ALTER TABLE "DiaryEntry" ADD COLUMN IF NOT EXISTS "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
