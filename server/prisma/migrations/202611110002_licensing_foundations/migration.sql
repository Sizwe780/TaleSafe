CREATE TYPE "VerificationState" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "Story" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Story" ADD COLUMN "communityEntityId" TEXT;
CREATE INDEX "Story_published_createdAt_idx" ON "Story"("published", "createdAt");

CREATE TABLE "LicenseeProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "kind" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "businessDomain" TEXT,
  "registrationNumber" TEXT,
  "verificationState" "VerificationState" NOT NULL DEFAULT 'UNVERIFIED',
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "businessVerified" BOOLEAN NOT NULL DEFAULT false,
  "directorMatchVerified" BOOLEAN NOT NULL DEFAULT false,
  "educationNgoVerified" BOOLEAN NOT NULL DEFAULT false,
  "providerReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "LicenseDraft" (
  "id" TEXT PRIMARY KEY,
  "requesterId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "storyId" TEXT NOT NULL REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "terms" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "LicenseDraft_requesterId_updatedAt_idx" ON "LicenseDraft"("requesterId", "updatedAt");

CREATE TABLE "CommunityEntity" (
  "id" TEXT PRIMARY KEY,
  "applicantId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "registrationNumber" TEXT NOT NULL,
  "verificationState" "VerificationState" NOT NULL DEFAULT 'UNVERIFIED',
  "entityVerified" BOOLEAN NOT NULL DEFAULT false,
  "mandateApproved" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "CommunityEntity_applicantId_idx" ON "CommunityEntity"("applicantId");
ALTER TABLE "Story" ADD CONSTRAINT "Story_communityEntityId_fkey" FOREIGN KEY ("communityEntityId") REFERENCES "CommunityEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CommunityAdmin" (
  "id" TEXT PRIMARY KEY,
  "entityId" TEXT NOT NULL REFERENCES "CommunityEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "verificationState" "VerificationState" NOT NULL DEFAULT 'UNVERIFIED',
  "mandateBlobName" TEXT,
  "reviewedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "CommunityAdmin_entityId_userId_key" ON "CommunityAdmin"("entityId", "userId");
