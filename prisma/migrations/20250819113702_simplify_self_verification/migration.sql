/*
  Warnings:

  - You are about to drop the `_SpamReports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `featured_content` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ip_rate_limits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quiz_reward_tracking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reward_distributions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `room_participants` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rooms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snarkel_allowlists` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snarkel_rewards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `snarkels` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `socket_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_SpamReports" DROP CONSTRAINT "_SpamReports_A_fkey";

-- DropForeignKey
ALTER TABLE "_SpamReports" DROP CONSTRAINT "_SpamReports_B_fkey";

-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "featured_content" DROP CONSTRAINT "featured_content_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "ip_rate_limits" DROP CONSTRAINT "ip_rate_limits_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "options" DROP CONSTRAINT "options_questionId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "quiz_reward_tracking" DROP CONSTRAINT "quiz_reward_tracking_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "reward_distributions" DROP CONSTRAINT "reward_distributions_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "reward_distributions" DROP CONSTRAINT "reward_distributions_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "reward_distributions" DROP CONSTRAINT "reward_distributions_userId_fkey";

-- DropForeignKey
ALTER TABLE "room_participants" DROP CONSTRAINT "room_participants_roomId_fkey";

-- DropForeignKey
ALTER TABLE "room_participants" DROP CONSTRAINT "room_participants_userId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_adminId_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "snarkel_allowlists" DROP CONSTRAINT "snarkel_allowlists_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "snarkel_allowlists" DROP CONSTRAINT "snarkel_allowlists_userId_fkey";

-- DropForeignKey
ALTER TABLE "snarkel_rewards" DROP CONSTRAINT "snarkel_rewards_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "snarkels" DROP CONSTRAINT "snarkels_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "snarkels" DROP CONSTRAINT "snarkels_spamReviewedById_fkey";

-- DropForeignKey
ALTER TABLE "socket_sessions" DROP CONSTRAINT "socket_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_userId_fkey";

-- DropForeignKey
ALTER TABLE "verification_attempts" DROP CONSTRAINT "verification_attempts_snarkelId_fkey";

-- DropForeignKey
ALTER TABLE "verification_attempts" DROP CONSTRAINT "verification_attempts_userId_fkey";

-- DropTable
DROP TABLE "_SpamReports";

-- DropTable
DROP TABLE "answers";

-- DropTable
DROP TABLE "featured_content";

-- DropTable
DROP TABLE "ip_rate_limits";

-- DropTable
DROP TABLE "options";

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "quiz_reward_tracking";

-- DropTable
DROP TABLE "reward_distributions";

-- DropTable
DROP TABLE "room_participants";

-- DropTable
DROP TABLE "rooms";

-- DropTable
DROP TABLE "snarkel_allowlists";

-- DropTable
DROP TABLE "snarkel_rewards";

-- DropTable
DROP TABLE "snarkels";

-- DropTable
DROP TABLE "socket_sessions";

-- DropTable
DROP TABLE "submissions";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "verification_attempts";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "name" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "country" TEXT,
    "nationality" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snarkel" (
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
    "entryToken" TEXT,
    "maxParticipants" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,
    "rewardsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onchainSessionId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "maxPossibleScore" INTEGER,
    "requireVerification" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "spamReason" TEXT,
    "spamReportedById" TEXT,
    "spamReportedAt" TIMESTAMP(3),
    "spamReviewedById" TEXT,
    "spamReviewedReason" TEXT,
    "spamReviewedComment" TEXT,

    CONSTRAINT "Snarkel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "snarkelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snarkelId" TEXT,
    "verificationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "proofData" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedContent" (
    "id" TEXT NOT NULL,
    "snarkelId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1000,
    "timeLimit" INTEGER NOT NULL DEFAULT 15,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "averageTimePerQuestion" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "snarkelId" TEXT NOT NULL,
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "rewardClaimedAt" TIMESTAMP(3),
    "rewardTxHash" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptions" TEXT[],
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "timeToAnswer" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submissionId" TEXT NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
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
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomParticipant" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RoomParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnarkelReward" (
    "id" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "tokenDecimals" INTEGER NOT NULL DEFAULT 18,
    "network" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 42220,
    "onchainSessionId" TEXT,
    "rewardAllParticipants" BOOLEAN NOT NULL DEFAULT false,
    "totalWinners" INTEGER,
    "rewardAmounts" JSONB,
    "totalRewardPool" TEXT,
    "minParticipants" INTEGER,
    "pointsWeight" DOUBLE PRECISION,
    "isDistributed" BOOLEAN NOT NULL DEFAULT false,
    "distributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "SnarkelReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardDistribution" (
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

    CONSTRAINT "RewardDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnarkelAllowlist" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "SnarkelAllowlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SnarkelToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Snarkel_snarkelCode_key" ON "Snarkel"("snarkelCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_snarkelId_userId_key" ON "Participant"("snarkelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedContent_snarkelId_key" ON "FeaturedContent"("snarkelId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_snarkelId_sessionNumber_key" ON "Room"("snarkelId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RoomParticipant_roomId_userId_key" ON "RoomParticipant"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_SnarkelToUser_AB_unique" ON "_SnarkelToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SnarkelToUser_B_index" ON "_SnarkelToUser"("B");

-- AddForeignKey
ALTER TABLE "Snarkel" ADD CONSTRAINT "Snarkel_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snarkel" ADD CONSTRAINT "Snarkel_spamReportedById_fkey" FOREIGN KEY ("spamReportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snarkel" ADD CONSTRAINT "Snarkel_spamReviewedById_fkey" FOREIGN KEY ("spamReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAttempt" ADD CONSTRAINT "VerificationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationAttempt" ADD CONSTRAINT "VerificationAttempt_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomParticipant" ADD CONSTRAINT "RoomParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnarkelReward" ADD CONSTRAINT "SnarkelReward_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDistribution" ADD CONSTRAINT "RewardDistribution_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "SnarkelReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDistribution" ADD CONSTRAINT "RewardDistribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardDistribution" ADD CONSTRAINT "RewardDistribution_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnarkelAllowlist" ADD CONSTRAINT "SnarkelAllowlist_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnarkelAllowlist" ADD CONSTRAINT "SnarkelAllowlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SnarkelToUser" ADD CONSTRAINT "_SnarkelToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Snarkel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SnarkelToUser" ADD CONSTRAINT "_SnarkelToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
