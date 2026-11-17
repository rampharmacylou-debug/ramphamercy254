-- Staff view tabs: editable names, visibility, order and visible fields.
CREATE TABLE IF NOT EXISTS "StaffTabConfig" (
    "id"        TEXT NOT NULL DEFAULT 'staff',
    "config"    JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffTabConfig_pkey" PRIMARY KEY ("id")
);
