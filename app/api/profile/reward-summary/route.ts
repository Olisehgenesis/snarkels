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
        summary: {
          totalQuizzes: 0,
          totalRewards: 0,
          claimedRewards: 0,
          pendingRewards: 0,
          networks: []
        }
      });
    }

    // Fetch user's quiz submissions with rewards
    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id
      },
      include: {
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
      }
    });

    // Calculate summary statistics
    const totalQuizzes = submissions.length;
    let totalRewards = 0;
    let claimedRewards = 0;
    let pendingRewards = 0;

    // Group by network
    const networkMap = new Map<number, { count: number; totalAmount: number }>();

    submissions.forEach(submission => {
      const rewardDistribution = submission.rewardDistributions[0];
      if (rewardDistribution?.amount) {
        const amount = parseFloat(rewardDistribution.amount.toString());
        const chainId = rewardDistribution.reward?.chainId || 8453;
        
        totalRewards += amount;
        
        if (submission.rewardClaimed) {
          claimedRewards += amount;
        } else {
          pendingRewards += amount;
        }

        // Update network stats
        if (networkMap.has(chainId)) {
          const existing = networkMap.get(chainId)!;
          existing.count += 1;
          existing.totalAmount += amount;
        } else {
          networkMap.set(chainId, { count: 1, totalAmount: amount });
        }
      }
    });

    // Convert network map to array
    const networks = Array.from(networkMap.entries()).map(([chainId, stats]) => ({
      chainId,
      name: getNetworkName(chainId),
      count: stats.count,
      totalAmount: stats.totalAmount.toFixed(2)
    }));

    // Sort networks by total amount (descending)
    networks.sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount));

    const summary = {
      totalQuizzes,
      totalRewards: totalRewards.toFixed(2),
      claimedRewards: claimedRewards.toFixed(2),
      pendingRewards: pendingRewards.toFixed(2),
      networks
    };

    return NextResponse.json({
      success: true,
      summary
    });

  } catch (error: any) {
    console.error('Error fetching reward summary:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch reward summary',
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
