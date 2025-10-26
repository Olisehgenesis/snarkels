import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/index';

const prisma = new PrismaClient();

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ userId: string; snarkelId: string }> }
) {
  try {
    const { userId, snarkelId } = await params;

    // Get user's reward distribution for this snarkel
    const distribution = await prisma.rewardDistribution.findFirst({
      where: {
        userId,
        reward: {
          snarkelId
        }
      },
      include: {
        reward: {
          select: {
            tokenSymbol: true,
            tokenName: true,
            network: true,
            isDistributed: true,
            distributedAt: true
          }
        },
        user: {
          select: {
            address: true,
            name: true
          }
        }
      }
    });

    if (!distribution) {
      return NextResponse.json({
        success: false,
        error: 'No reward found for this user and snarkel'
      }, { status: 404 });
    }

    // Get user's submission for this snarkel
    const submission = await prisma.submission.findFirst({
      where: {
        userId,
        snarkelId
      },
      select: {
        score: true,
        totalPoints: true,
        totalQuestions: true,
        timeSpent: true,
        completedAt: true
      }
    });

    // Get room information
    const room = await prisma.room.findFirst({
      where: { snarkelId },
      select: {
        sessionNumber: true,
        isFinished: true,
        endTime: true,
        currentParticipants: true
      }
    });

    const userReward = {
      position: distribution.position,
      rewardAmount: distribution.amount,
      tokenSymbol: distribution.reward.tokenSymbol,
      tokenName: distribution.reward.tokenName,
      network: distribution.reward.network,
      transactionHash: distribution.txHash,
      status: distribution.isProcessed ? 'success' : 'pending',
      processedAt: distribution.processedAt,
      claimStatus: distribution.isProcessed ? 'claimed' : 'pending',
      submission: submission ? {
        score: submission.score,
        totalPoints: submission.totalPoints,
        totalQuestions: submission.totalQuestions,
        timeSpent: submission.timeSpent,
        completedAt: submission.completedAt
      } : null,
      roomInfo: room ? {
        sessionNumber: room.sessionNumber,
        isFinished: room.isFinished,
        endTime: room.endTime,
        totalParticipants: room.currentParticipants
      } : null,
      rewardInfo: {
        isDistributed: distribution.reward.isDistributed,
        distributedAt: distribution.reward.distributedAt
      }
    };

    return NextResponse.json({
      success: true,
      data: userReward
    });

  } catch (error: any) {
    console.error('Error fetching user reward:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch user reward'
    }, { status: 500 });
  }
} 