-- AlterTable
ALTER TABLE "snarkels" ADD COLUMN     "allowedCountries" TEXT[],
ADD COLUMN     "captchaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cooldownPeriod" INTEGER,
ADD COLUMN     "excludedCountries" TEXT[],
ADD COLUMN     "isSpam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxParticipantsPerIP" INTEGER,
ADD COLUMN     "minAge" INTEGER,
ADD COLUMN     "rateLimitPerHour" INTEGER,
ADD COLUMN     "requireVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spamReason" TEXT,
ADD COLUMN     "spamReportedAt" TIMESTAMP(3),
ADD COLUMN     "spamReviewedAt" TIMESTAMP(3),
ADD COLUMN     "spamReviewedById" TEXT,
ADD COLUMN     "spamReviewedComment" TEXT,
ADD COLUMN     "spamReviewedReason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "verificationMethod" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "verification_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snarkelId" TEXT,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proofData" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_rate_limits" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "snarkelId" TEXT,
    "joinCount" INTEGER NOT NULL DEFAULT 0,
    "lastJoinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ip_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SpamReports" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ip_rate_limits_ipAddress_snarkelId_key" ON "ip_rate_limits"("ipAddress", "snarkelId");

-- CreateIndex
CREATE UNIQUE INDEX "_SpamReports_AB_unique" ON "_SpamReports"("A", "B");

-- CreateIndex
CREATE INDEX "_SpamReports_B_index" ON "_SpamReports"("B");

-- AddForeignKey
ALTER TABLE "snarkels" ADD CONSTRAINT "snarkels_spamReviewedById_fkey" FOREIGN KEY ("spamReviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_attempts" ADD CONSTRAINT "verification_attempts_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ip_rate_limits" ADD CONSTRAINT "ip_rate_limits_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpamReports" ADD CONSTRAINT "_SpamReports_A_fkey" FOREIGN KEY ("A") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SpamReports" ADD CONSTRAINT "_SpamReports_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
