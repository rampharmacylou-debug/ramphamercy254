-- Appearance settings: app name, theme, brand color, fonts and hidden stat cards.
CREATE TABLE IF NOT EXISTS "AppearanceConfig" (
    "id"        TEXT NOT NULL DEFAULT 'appearance',
    "config"    JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppearanceConfig_pkey" PRIMARY KEY ("id")
);
