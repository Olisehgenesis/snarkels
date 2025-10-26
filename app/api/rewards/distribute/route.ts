import { NextRequest, NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { getReferralDataSuffix, submitDivviReferral } from '@/lib/divvi';
import { PrismaClient } from '@prisma/client/edge';
import { privateKeyToAccount } from 'viem/accounts' ;
import { createWalletClient, createPublicClient, http, parseEther, getAddress } from 'viem';
import { celo, base } from 'viem/chains';
import { erc20Abi } from 'viem';

const prisma = new PrismaClient();

interface LeaderboardEntry {
  userId: string;
  walletAddress: string;
  score: number;
  position: number;
  timeBonus: number;
  finalPoints: number;
}

interface RewardConfig {
  type: 'LINEAR' | 'QUADRATIC';
  tokenAddress: string;
  totalRewardPool?: string;
  rewardAmounts?: number[];
  totalWinners?: number;
}

interface DistributionResult {
  success: boolean;
  message: string;
  distributions: Array<{
    position: number;
    participant: string;
    walletAddress: string;
    rewardAmount: string;
    transactionHash?: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
  }>;
  totalDistributed: string;
  failedTransactions: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelId, sessionId, leaderboard, rewardConfig } = body;

    // Validate required fields
    if (!snarkelId || !sessionId || !leaderboard || !rewardConfig) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: snarkelId, sessionId, leaderboard, rewardConfig'
      }, { status: 400 });
    }

    // Get admin wallet private key from environment
    const adminPrivateKey = process.env.ADMIN_WALLET;
    if (!adminPrivateKey) {
      return NextResponse.json({
        success: false,
        error: 'Admin wallet not configured'
      }, { status: 500 });
    }

    // Create admin account from private key
    const adminAccount = privateKeyToAccount(adminPrivateKey as `0x${string}`);
    
    // Determine chain from rewardConfig or default to Celo mainnet
    const chainId = rewardConfig?.totalRewardPool || rewardConfig?.rewardAmounts ? (rewardConfig as any).chainId : undefined;
    const selectedChain = (() => {
      switch (chainId) {
        case 42220: return celo;
        case 8453: return base;
        default: return base; // Default to Base instead of Celo
      }
    })();

    // Create wallet/public clients on selected chain
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: selectedChain,
      transport: http()
    });

    const publicClient = createPublicClient({
      chain: selectedChain,
      transport: http()
    });

    // Validate reward configuration
    if (!validateRewardConfig(rewardConfig)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid reward configuration'
      }, { status: 400 });
    }

    // Calculate reward distributions
    const distributions = calculateRewards(leaderboard, rewardConfig);
    
    // Check admin wallet balance
    const tokenContract = {
      address: getAddress(rewardConfig.tokenAddress),
      abi: erc20Abi
    };

    const adminBalance = await publicClient.readContract({
      ...tokenContract,
      functionName: 'balanceOf',
      args: [adminAccount.address]
    });

    const totalRequired = distributions.reduce((sum, dist) => 
      sum + parseEther(dist.rewardAmount), BigInt(0)
    );

    if (adminBalance < totalRequired) {
      return NextResponse.json({
        success: false,
        error: `Insufficient admin balance. Required: ${totalRequired}, Available: ${adminBalance}`
      }, { status: 400 });
    }

    // Execute batch transfers
    const distributionResult = await executeBatchTransfers(
      walletClient,
      tokenContract,
      distributions
    );

    // Update database with distribution results
    await updateDistributionDatabase(snarkelId, sessionId, distributionResult);

    return NextResponse.json({
      success: true,
      message: 'Rewards distributed successfully',
      result: distributionResult
    });

  } catch (error: any) {
    console.error('Error distributing rewards:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to distribute rewards'
    }, { status: 500 });
  }
}

function validateRewardConfig(config: RewardConfig): boolean {
  if (!config.tokenAddress || !config.type) {
    return false;
  }

  if (config.type === 'LINEAR') {
    return !!(config.rewardAmounts && config.rewardAmounts.length > 0);
  }

  if (config.type === 'QUADRATIC') {
    return !!(config.totalRewardPool && parseFloat(config.totalRewardPool) > 0);
  }

  return false;
}

function calculateRewards(leaderboard: LeaderboardEntry[], config: RewardConfig) {
  if (config.type === 'LINEAR') {
    return calculateLinearRewards(leaderboard, config.rewardAmounts!);
  } else {
    return calculateQuadraticRewards(leaderboard, config.totalRewardPool!);
  }
}

function calculateLinearRewards(leaderboard: LeaderboardEntry[], rewardAmounts: number[]) {
  return leaderboard
    .filter((entry, index) => index < rewardAmounts.length)
    .map((entry, index) => ({
      position: entry.position,
      participant: entry.userId,
      walletAddress: entry.walletAddress,
      rewardAmount: rewardAmounts[index].toString(),
      status: 'pending' as const
    }));
}

function calculateQuadraticRewards(leaderboard: LeaderboardEntry[], totalPool: string) {
  const totalPoints = leaderboard.reduce((sum, entry) => sum + entry.finalPoints, 0);
  const poolAmount = parseEther(totalPool);

  return leaderboard.map(entry => {
    const share = entry.finalPoints / totalPoints;
    const rewardAmount = (poolAmount * BigInt(Math.round(share * 1000000))) / BigInt(1000000);
    
    return {
      position: entry.position,
      participant: entry.userId,
      walletAddress: entry.walletAddress,
      rewardAmount: rewardAmount.toString(),
      status: 'pending' as const
    };
  });
}

async function executeBatchTransfers(
  walletClient: any,
  tokenContract: any,
  distributions: any[]
): Promise<DistributionResult> {
  const results = [];
  let totalDistributed = BigInt(0);
  let failedTransactions = 0;

  for (const distribution of distributions) {
    try {
      const hash = await walletClient.writeContract({
        ...tokenContract,
        functionName: 'transfer',
        args: [
          getAddress(distribution.walletAddress),
          parseEther(distribution.rewardAmount)
        ],
        dataSuffix: getReferralDataSuffix()
      });

      // Wait for transaction confirmation
      const receipt = await walletClient.waitForTransactionReceipt({ hash });
      submitDivviReferral(hash as Hex, base.id).catch(() => {});

      results.push({
        ...distribution,
        transactionHash: hash,
        status: 'success' as const
      });

      totalDistributed += parseEther(distribution.rewardAmount);

    } catch (error: any) {
      console.error(`Failed to transfer reward to ${distribution.walletAddress}:`, error);
      
      results.push({
        ...distribution,
        status: 'failed' as const,
        error: error.message
      });

      failedTransactions++;
    }
  }

  return {
    success: failedTransactions === 0,
    message: failedTransactions === 0 
      ? 'All rewards distributed successfully' 
      : `${distributions.length - failedTransactions} of ${distributions.length} rewards distributed`,
    distributions: results,
    totalDistributed: totalDistributed.toString(),
    failedTransactions
  };
}

async function updateDistributionDatabase(
  snarkelId: string, 
  sessionId: string, 
  result: DistributionResult
) {
  // Update room distribution status
  await prisma.room.update({
    where: { id: sessionId },
    data: {
      isFinished: true,
      endTime: new Date()
    }
  });

  // Create reward distribution records
  for (const distribution of result.distributions) {
    await prisma.rewardDistribution.create({
      data: {
        position: distribution.position,
        amount: distribution.rewardAmount,
        txHash: distribution.transactionHash,
        isProcessed: distribution.status === 'success',
        processedAt: distribution.status === 'success' ? new Date() : null,
        rewardId: snarkelId, // This should be the actual reward ID
        userId: distribution.participant,
        submissionId: sessionId // This should be the actual submission ID
      }
    });
  }

  // Update snarkel reward distribution status
  await prisma.snarkelReward.updateMany({
    where: { snarkelId },
    data: {
      isDistributed: result.success,
      distributedAt: result.success ? new Date() : null
    }
  });
} 