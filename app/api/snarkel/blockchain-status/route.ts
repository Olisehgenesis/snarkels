import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelCode } = body;

    if (!snarkelCode) {
      return NextResponse.json(
        { error: 'Snarkel code is required' },
        { status: 400 }
      );
    }

    // Find the snarkel by code
    const snarkel = await prisma.snarkel.findUnique({
      where: { snarkelCode },
      include: {
        rewards: {
          include: {
            distributions: true
          }
        },
        rooms: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }

    // Check if snarkel has rewards configured
    const hasRewards = snarkel.rewards && snarkel.rewards.length > 0;
    
    // Check if there are active rooms (sessions) on blockchain
    const hasActiveSessions = snarkel.rooms && snarkel.rooms.length > 0;
    
    // For now, we'll assume if there are rewards or active sessions, it's on blockchain
    // In a real implementation, you'd check the actual blockchain contract
    const isOnBlockchain = hasRewards || hasActiveSessions;
    
    // Get the current chain ID (default to Base for now)
    const currentChain = 8453; // Base Mainnet
    
    // Get session ID if exists
    const sessionId = hasActiveSessions ? snarkel.rooms[0]?.id : null;

    // Get existing reward config if available
    let rewardConfig = null;
    if (hasRewards && snarkel.rewards[0]) {
      const reward = snarkel.rewards[0];
      rewardConfig = {
        enabled: true,
        type: reward.rewardType || 'QUADRATIC',
        tokenAddress: reward.tokenAddress || '',
        chainId: reward.chainId || currentChain,
        totalWinners: reward.totalWinners || 5,
        totalRewardPool: reward.totalRewardPool || '0',
        minParticipants: reward.minParticipants || 3,
        pointsWeight: reward.pointsWeight || 0.7,
        rewardAllParticipants: reward.rewardAllParticipants || false
      };
    }

    const status = {
      isOnBlockchain,
      currentChain,
      sessionId,
      hasRewards,
      snarkelId: snarkel.id,
      title: snarkel.title
    };

    return NextResponse.json({
      success: true,
      status,
      rewardConfig
    });

  } catch (error: any) {
    console.error('Error checking blockchain status:', error);
    
    return NextResponse.json(
      { error: 'Failed to check blockchain status' },
      { status: 500 }
    );
  }
}
