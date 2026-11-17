-- Admin password + trusted devices, and a separate "last scheduled run" marker
-- for the daily backup timer. Safe to re-run.

ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "lastScheduledRunAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "AdminAuth" (
    "id"           TEXT NOT NULL DEFAULT 'admin',
    "passwordHash" TEXT NOT NULL,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminAuth_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TrustedDevice" (
    "id"         TEXT NOT NULL,
    "label"      TEXT NOT NULL,
    "tokenHash"  TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrustedDevice_tokenHash_key" ON "TrustedDevice"("tokenHash");
