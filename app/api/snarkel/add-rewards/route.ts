import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 8453: return 'Base';
    case 42220: return 'Celo';
    
    
    default: return `Chain ${chainId}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelCode, rewardConfig, blockchainStatus } = body;

    if (!snarkelCode || !rewardConfig) {
      return NextResponse.json(
        { error: 'Snarkel code and reward config are required' },
        { status: 400 }
      );
    }

    // Find the snarkel by code
    const snarkel = await prisma.snarkel.findUnique({
      where: { snarkelCode },
      include: {
        rewards: true
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }

    // Check if rewards already exist
    if (snarkel.rewards && snarkel.rewards.length > 0) {
      return NextResponse.json(
        { error: 'Rewards already configured for this snarkel' },
        { status: 400 }
      );
    }

    // Map reward type to valid enum value
    const rewardType = rewardConfig.type === 'QUADRATIC' ? 'QUADRATIC' : 'LINEAR';

    // Create reward configuration
    const reward = await prisma.snarkelReward.create({
      data: {
        snarkelId: snarkel.id,
        rewardType,
        tokenAddress: rewardConfig.tokenAddress,
        tokenSymbol: 'TOKEN', // Default symbol
        tokenName: 'Reward Token', // Default name
        tokenDecimals: 18,
        network: getNetworkName(rewardConfig.chainId),
        chainId: rewardConfig.chainId,
        totalWinners: rewardConfig.totalWinners || 5,
        rewardAmounts: rewardConfig.rewardAmounts || [35, 25, 20, 15, 5],
        totalRewardPool: rewardConfig.totalRewardPool,
        minParticipants: rewardConfig.minParticipants || 3,
        pointsWeight: rewardConfig.pointsWeight || 0.7,
        rewardAllParticipants: rewardConfig.rewardAllParticipants || false,
        isDistributed: false
      }
    });

    // If the quiz is not on blockchain yet, we need to create a session
    if (!blockchainStatus?.isOnBlockchain) {
      // Create a room (session) for the quiz
      const room = await prisma.room.create({
        data: {
          snarkelId: snarkel.id,
          adminId: snarkel.creatorId, // Use the snarkel creator as admin
          name: `Quiz Session - ${snarkel.title}`,
          description: `Auto-created session for ${snarkel.title}`,
          sessionNumber: 1,
          isActive: true,
          isWaiting: true,
          isStarted: false,
          isFinished: false,
          currentParticipants: 0,
          maxParticipants: 100 // Default max participants
        }
      });

      console.log('Created new room for quiz:', room.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Rewards added successfully',
      rewardId: reward.id,
      snarkelId: snarkel.id
    });

  } catch (error: any) {
    console.error('Error adding rewards:', error);
    
    return NextResponse.json(
      { error: 'Failed to add rewards' },
      { status: 500 }
    );
  }
}
