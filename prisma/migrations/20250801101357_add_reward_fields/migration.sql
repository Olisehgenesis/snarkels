-- AlterTable
ALTER TABLE "snarkel_rewards" ADD COLUMN     "chainId" INTEGER NOT NULL DEFAULT 42220,
ADD COLUMN     "onchainSessionId" TEXT;

-- AlterTable
ALTER TABLE "snarkels" ADD COLUMN     "onchainSessionId" TEXT,
ADD COLUMN     "rewardsEnabled" BOOLEAN NOT NULL DEFAULT false;
