CREATE TYPE "AiConsent" AS ENUM ('NOT_ALLOWED', 'ALLOWED', 'COMPENSATION_REQUIRED');
CREATE TYPE "LicenseTier" AS ENUM ('EDUCATIONAL', 'FILM', 'AI_COMPANY');
CREATE TYPE "LicenseStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "entraId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "blobName" TEXT NOT NULL,
    "commercialUse" BOOLEAN NOT NULL DEFAULT false,
    "aiConsent" "AiConsent" NOT NULL DEFAULT 'NOT_ALLOWED',
    "culturalHeritage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "tier" "LicenseTier" NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_entraId_key" ON "User"("entraId");
CREATE UNIQUE INDEX "Story_blobName_key" ON "Story"("blobName");
CREATE INDEX "Story_ownerId_createdAt_idx" ON "Story"("ownerId", "createdAt");
CREATE INDEX "Story_sha256_idx" ON "Story"("sha256");
CREATE INDEX "License_storyId_status_idx" ON "License"("storyId", "status");
CREATE INDEX "License_requesterId_idx" ON "License"("requesterId");

ALTER TABLE "Story" ADD CONSTRAINT "Story_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "License" ADD CONSTRAINT "License_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- connect-pg-simple session store. This table is intentionally managed by SQL,
-- outside the Prisma application models. Do not use db push to sync this project.
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX "IDX_session_expire" ON "session"("expire");
