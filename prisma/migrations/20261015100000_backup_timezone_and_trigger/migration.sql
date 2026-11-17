-- Backup schedule now has its own time zone (so "20:00" means 20:00 where you are, not on the
-- server) and records when anything last checked the schedule. Safe to re-run.

ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi';
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "lastCheckAt" TIMESTAMP(3);
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "lastCheckSource" TEXT;
