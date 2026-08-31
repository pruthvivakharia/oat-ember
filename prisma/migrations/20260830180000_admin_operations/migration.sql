CREATE TABLE "Offer" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT NOT NULL,
  "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
  "value" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Offer_code_key" ON "Offer"("code");
CREATE INDEX "Offer_active_startsAt_endsAt_idx" ON "Offer"("active", "startsAt", "endsAt");
CREATE TABLE "Staff" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'COUNTER',
  "shift" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Staff_active_role_idx" ON "Staff"("active", "role");
CREATE TABLE "CafeSetting" (
  "id" TEXT NOT NULL,
  "cafeName" TEXT NOT NULL DEFAULT 'Oat & Ember',
  "tagline" TEXT NOT NULL DEFAULT 'Takeaway coffee · Surat',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "openingHours" TEXT NOT NULL DEFAULT '08:00 - 22:00',
  "taxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderLeadTime" INTEGER NOT NULL DEFAULT 15,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  "onlinePaymentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CafeSetting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QrEntry" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'COUNTER',
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QrEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QrEntry_token_key" ON "QrEntry"("token");
CREATE INDEX "QrEntry_active_kind_idx" ON "QrEntry"("active", "kind");
