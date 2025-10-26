import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { address: userAddress.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        quizzes: []
      });
    }

    // Fetch user's quiz submissions with rewards
    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id
      },
      include: {
        snarkel: {
          select: {
            id: true,
            title: true,
            snarkelCode: true
          }
        },
        rewardDistributions: {
          include: {
            reward: {
              select: {
                tokenAddress: true,
                chainId: true
              }
            }
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Transform submissions to quiz history format
    const quizHistory = submissions.map((submission, index) => {
      // Calculate position based on score (simplified - in real app this would come from blockchain)
      const position = index + 1;
      
      // Get reward information
      const rewardDistribution = submission.rewardDistributions[0];
      const rewardAmount = rewardDistribution?.amount || null;
      const rewardToken = rewardDistribution?.reward?.tokenAddress || null;
      const chainId = rewardDistribution?.reward?.chainId || 8453; // Default to Base
      
      return {
        id: submission.id,
        snarkelCode: submission.snarkel.snarkelCode,
        title: submission.snarkel.title,
        score: submission.score,
        totalPoints: submission.totalPoints,
        position,
        completedAt: submission.completedAt.toISOString(),
        chainId,
        networkName: getNetworkName(chainId),
        rewardAmount: rewardAmount ? rewardAmount.toString() : undefined,
        rewardToken: rewardToken || undefined,
        rewardClaimed: submission.rewardClaimed || false,
        rewardClaimedAt: submission.rewardClaimedAt?.toISOString() || undefined,
        rewardTxHash: submission.rewardTxHash || undefined
      };
    });

    return NextResponse.json({
      success: true,
      quizzes: quizHistory
    });

  } catch (error: any) {
    console.error('Error fetching quiz history:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz history',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 8453: return 'Base';
    case 42220: return 'Celo';
    
    
    default: return `Chain ${chainId}`;
  }
}
