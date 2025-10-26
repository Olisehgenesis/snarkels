-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('QUADRATIC', 'LINEAR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 50,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isWaiting" BOOLEAN NOT NULL DEFAULT true,
    "isStarted" BOOLEAN NOT NULL DEFAULT false,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "autoStartEnabled" BOOLEAN NOT NULL DEFAULT false,
    "countdownDuration" INTEGER NOT NULL DEFAULT 10,
    "scheduledStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,
    "snarkelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_participants" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snarkels" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costCelo" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "maxQuestions" INTEGER NOT NULL DEFAULT 60,
    "startTime" TIMESTAMP(3),
    "autoStartEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "snarkelCode" TEXT NOT NULL,
    "spamControlEnabled" BOOLEAN NOT NULL DEFAULT false,
    "entryFeeAmount" TEXT,
    "entryFeeTokenAddress" TEXT,
    "entryFeeTokenSymbol" TEXT,
    "entryFeeTokenName" TEXT,
    "entryFeeNetwork" TEXT,
    "entryFeeDecimals" INTEGER,
    "basePointsPerQuestion" INTEGER NOT NULL DEFAULT 1000,
    "speedBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxSpeedBonus" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "snarkels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snarkel_allowlists" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "snarkel_allowlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snarkel_rewards" (
    "id" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL DEFAULT 18,
    "network" TEXT NOT NULL,
    "totalWinners" INTEGER,
    "rewardAmounts" JSONB,
    "totalRewardPool" TEXT,
    "minParticipants" INTEGER,
    "pointsWeight" DOUBLE PRECISION,
    "isDistributed" BOOLEAN NOT NULL DEFAULT false,
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "snarkel_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_distributions" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" TEXT NOT NULL,
    "txHash" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "reward_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1000,
    "timeLimit" INTEGER NOT NULL DEFAULT 15,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "averageTimePerQuestion" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptions" TEXT[],
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timeToAnswer" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socket_sessions" (
    "id" TEXT NOT NULL,
    "socketId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "snarkelId" TEXT,
    "roomId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "socket_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "featured_content" (
    "id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "featured_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

-- CreateIndex
CREATE INDEX "users_address_idx" ON "users"("address");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_snarkelId_key" ON "rooms"("snarkelId");

-- CreateIndex
CREATE UNIQUE INDEX "room_participants_roomId_userId_key" ON "room_participants"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "snarkels_snarkelCode_key" ON "snarkels"("snarkelCode");

-- CreateIndex
CREATE INDEX "snarkel_allowlists_address_idx" ON "snarkel_allowlists"("address");

-- CreateIndex
CREATE UNIQUE INDEX "snarkel_allowlists_snarkelId_address_key" ON "snarkel_allowlists"("snarkelId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "socket_sessions_socketId_key" ON "socket_sessions"("socketId");

-- CreateIndex
CREATE UNIQUE INDEX "featured_content_snarkelId_key" ON "featured_content"("snarkelId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snarkels" ADD CONSTRAINT "snarkels_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snarkel_allowlists" ADD CONSTRAINT "snarkel_allowlists_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snarkel_allowlists" ADD CONSTRAINT "snarkel_allowlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snarkel_rewards" ADD CONSTRAINT "snarkel_rewards_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "snarkel_rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_distributions" ADD CONSTRAINT "reward_distributions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socket_sessions" ADD CONSTRAINT "socket_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "featured_content" ADD CONSTRAINT "featured_content_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
