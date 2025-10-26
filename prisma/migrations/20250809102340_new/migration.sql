-- AlterTable
ALTER TABLE "snarkel_rewards" ADD COLUMN     "allRewardsClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "participantsRewarded" INTEGER DEFAULT 0,
ADD COLUMN     "rewardClaimPercentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "sessionRewardsDistributed" TEXT DEFAULT '0',
ALTER COLUMN "chainId" SET DEFAULT 44787;

-- AlterTable
ALTER TABLE "snarkels" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPossibleScore" INTEGER,
ADD COLUMN     "resultsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardPerPoint" TEXT,
ADD COLUMN     "rewardToken" TEXT,
ADD COLUMN     "rewardTokenDecimals" INTEGER,
ADD COLUMN     "rewardTokenName" TEXT,
ADD COLUMN     "rewardTokenSymbol" TEXT,
ADD COLUMN     "totalRewardPool" TEXT;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "rewardAmount" TEXT,
ADD COLUMN     "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rewardClaimedAt" TIMESTAMP(3),
ADD COLUMN     "rewardTxHash" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "quiz_reward_tracking" (
    "id" TEXT NOT NULL,
    "quizCode" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "tokenName" TEXT NOT NULL,
    "totalRewardsDistributed" TEXT NOT NULL DEFAULT '0',
    "totalSessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snarkelId" TEXT NOT NULL,

    CONSTRAINT "quiz_reward_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_reward_tracking_snarkelId_tokenAddress_key" ON "quiz_reward_tracking"("snarkelId", "tokenAddress");

-- AddForeignKey
ALTER TABLE "quiz_reward_tracking" ADD CONSTRAINT "quiz_reward_tracking_snarkelId_fkey" FOREIGN KEY ("snarkelId") REFERENCES "snarkels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
