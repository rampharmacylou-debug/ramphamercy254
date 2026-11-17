-- Diary settings (wording + on/off switches) and global-search display settings.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "DiaryConfig" (
    "id"        TEXT NOT NULL DEFAULT 'diary',
    "config"    JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DiaryConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SearchDisplayConfig" (
    "id"        TEXT NOT NULL DEFAULT 'search',
    "config"    JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchDisplayConfig_pkey" PRIMARY KEY ("id")
);
