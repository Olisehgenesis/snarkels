-- AlterTable
ALTER TABLE "snarkel_rewards" ADD COLUMN     "rewardAllParticipants" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "chainId" SET DEFAULT 42220;
