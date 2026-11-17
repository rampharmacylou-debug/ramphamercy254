-- Staff sign-in: staff accounts get a display name, an on/off switch, sign-out-everywhere,
-- and wrong-password lockout; plus one settings row (sign-in required? session length).
-- Safe to re-run.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "active"       BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLogins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil"  TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt"  TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "StaffAccess" (
    "id"           TEXT NOT NULL DEFAULT 'staff',
    "requireLogin" BOOLEAN NOT NULL DEFAULT true,
    "sessionHours" INTEGER NOT NULL DEFAULT 12,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffAccess_pkey" PRIMARY KEY ("id")
);
