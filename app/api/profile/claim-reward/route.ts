import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, userAddress } = body;

    if (!quizId || !userAddress) {
      return NextResponse.json(
        { error: 'Quiz ID and user address are required' },
        { status: 400 }
      );
    }

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { address: userAddress.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the submission
    const submission = await prisma.submission.findUnique({
      where: { id: quizId },
      include: {
        rewardDistributions: {
          include: {
            reward: true
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Quiz submission not found' },
        { status: 404 }
      );
    }

    // Check if user owns this submission
    if (submission.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to claim this reward' },
        { status: 403 }
      );
    }

    // Check if reward is already claimed
    if (submission.rewardClaimed) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 400 }
      );
    }

    // Check if there are rewards to claim
    if (!submission.rewardDistributions || submission.rewardDistributions.length === 0) {
      return NextResponse.json(
        { error: 'No rewards available to claim' },
        { status: 400 }
      );
    }

    // For now, we'll simulate claiming the reward
    // In a real implementation, this would interact with the blockchain contract
    const rewardDistribution = submission.rewardDistributions[0];
    const rewardAmount = rewardDistribution.amount;
    const chainId = rewardDistribution.reward.chainId;

    // Update submission to mark reward as claimed
    const updatedSubmission = await prisma.submission.update({
      where: { id: quizId },
      data: {
        rewardClaimed: true,
        rewardClaimedAt: new Date(),
        rewardTxHash: `simulated_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Simulated transaction hash
      }
    });

    // In a real implementation, you would:
    // 1. Call the smart contract to claim the reward
    // 2. Wait for the transaction to be confirmed
    // 3. Update the submission with the real transaction hash

    console.log(`Reward claimed for submission ${quizId}: ${rewardAmount} tokens on chain ${chainId}`);

    return NextResponse.json({
      success: true,
      message: 'Reward claimed successfully',
      rewardAmount: rewardAmount.toString(),
      chainId,
      transactionHash: updatedSubmission.rewardTxHash
    });

  } catch (error: any) {
    console.error('Error claiming reward:', error);
    return NextResponse.json(
      { 
        error: 'Failed to claim reward',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
