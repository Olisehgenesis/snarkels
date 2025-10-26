import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UpdateRewardsRequest {
  snarkelId: string;
  rewardConfig: {
    enabled: boolean;
    type: 'LINEAR' | 'QUADRATIC';
    tokenAddress: string;
    chainId: number;
    totalWinners?: number;
    rewardAmounts?: number[];
    totalRewardPool?: string;
    minParticipants?: number;
    pointsWeight?: number;
  };
  onchainSessionId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateRewardsRequest = await request.json();
    const { snarkelId, rewardConfig, onchainSessionId } = body;

    console.log('Request body:', { snarkelId, rewardConfig, onchainSessionId });

    // Validate required fields
    if (!snarkelId) {
      return NextResponse.json({
        success: false,
        error: 'Missing snarkelId'
      }, { status: 400 });
    }

    if (!rewardConfig) {
      return NextResponse.json({
        success: false,
        error: 'Missing rewardConfig'
      }, { status: 400 });
    }

    console.log('Updating snarkel with ID:', snarkelId);
    
    // Update the snarkel with reward configuration
    try {
      const updatedSnarkel = await prisma.snarkel.update({
        where: { id: snarkelId },
        data: {
          rewardsEnabled: rewardConfig.enabled,
          onchainSessionId: onchainSessionId || null,
        },
      });
      
      console.log('Snarkel updated successfully:', updatedSnarkel.id);
    } catch (error: any) {
      console.error('Error updating snarkel:', error);
      throw new Error(`Failed to update snarkel: ${error.message}`);
    }

    // If rewards are enabled, create or update the reward record
    if (rewardConfig.enabled) {
      const rewardData = {
        rewardType: rewardConfig.type,
        tokenAddress: rewardConfig.tokenAddress,
        tokenSymbol: 'TOKEN', // This would come from token validation
        tokenName: 'Reward Token', // This would come from token validation
        tokenDecimals: 18,
        network: rewardConfig.chainId === 42220 ? 'Celo Mainnet' : 'Base',
        chainId: rewardConfig.chainId,
        totalWinners: rewardConfig.totalWinners,
        rewardAmounts: rewardConfig.rewardAmounts,
        totalRewardPool: rewardConfig.totalRewardPool,
        minParticipants: rewardConfig.minParticipants,
        pointsWeight: rewardConfig.pointsWeight,
        onchainSessionId: onchainSessionId || null,
        snarkelId: snarkelId,
      };

      console.log('Processing reward configuration:', rewardConfig);
      
      // Check if a reward record already exists for this snarkel
      const existingReward = await prisma.snarkelReward.findFirst({
        where: { snarkelId },
      });

      console.log('Existing reward found:', existingReward ? existingReward.id : 'none');

      if (existingReward) {
        // Update existing reward record
        console.log('Updating existing reward record');
        try {
          await prisma.snarkelReward.update({
            where: { id: existingReward.id },
            data: rewardData,
          });
          console.log('Reward record updated successfully');
        } catch (error: any) {
          console.error('Error updating reward record:', error);
          throw new Error(`Failed to update reward record: ${error.message}`);
        }
      } else {
        // Create new reward record
        console.log('Creating new reward record');
        try {
          await prisma.snarkelReward.create({
            data: rewardData,
          });
          console.log('Reward record created successfully');
        } catch (error: any) {
          console.error('Error creating reward record:', error);
          throw new Error(`Failed to create reward record: ${error.message}`);
        }
      }
    } else {
      // If rewards are disabled, delete any existing reward records
      await prisma.snarkelReward.deleteMany({
        where: { snarkelId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Reward configuration updated successfully',
      snarkelId,
      onchainSessionId,
    });

  } catch (error: any) {
    console.error('Error updating rewards:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({
      success: false,
      error: 'Failed to update reward configuration',
      details: error.message
    }, { status: 500 });
  }
} 