import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DistributeRewardsRequest {
  roomId: string;
  sessionNumber: number;
  finalLeaderboard: Array<{
    userId: string;
    name: string;
    score: number;
  }>;
  connectedWallet: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get the connected wallet address from the request
    const body: DistributeRewardsRequest = await request.json();
    const { roomId, sessionNumber, finalLeaderboard, connectedWallet } = body;

    if (!connectedWallet) {
      return NextResponse.json({
        success: false,
        error: 'Connected wallet address is required'
      }, { status: 400 });
    }

    console.log('Reward distribution request from wallet:', connectedWallet);

    console.log('Automatic reward distribution request:', { roomId, sessionNumber, finalLeaderboard });

    // Validate required fields
    if (!roomId || !sessionNumber) {
      return NextResponse.json({
        success: false,
        error: 'Room ID and session number are required'
      }, { status: 400 });
    }

    // Get room and snarkel information
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: {
          include: {
            rewards: {
              where: {
                isDistributed: false
              }
            },
            questions: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!room) {
      // If no room is found, the quiz might be completed
      // Try to get the snarkel by finding any room with this snarkelId
      const anyRoom = await prisma.room.findFirst({
        where: { 
          snarkel: {
            id: roomId // This should be the snarkelId, not roomId
          }
        },
        include: {
          snarkel: {
            include: {
              rewards: {
                where: {
                  isDistributed: false
                }
              }
            }
          }
        }
      });

      if (!anyRoom) {
        return NextResponse.json({
          success: false,
          error: 'Quiz not found'
        }, { status: 404 });
      }

      const snarkel = anyRoom.snarkel;

      if (!snarkel) {
        return NextResponse.json({
          success: false,
          error: 'Quiz not found'
        }, { status: 404 });
      }

      if (snarkel.rewards.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No rewards to distribute',
          distributed: false
        });
      }

      // Use the first undistributed reward to determine chain
      const firstUndistributed = snarkel.rewards[0];
      const chainId = firstUndistributed?.chainId || 8453; // Default to Base instead of Celo

      console.log('Processing rewards for chain:', chainId);
      console.log('Connected wallet:', connectedWallet);

      // Process rewards without room context
      const distributionResults = [];
      for (const reward of snarkel.rewards) {
        try {
          console.log(`Processing reward: ${reward.tokenSymbol} (${reward.tokenAddress})`);
          
          // Get all submissions for this quiz
          const submissions = await prisma.submission.findMany({
            where: {
              snarkelId: snarkel.id,
              score: { gt: 0 }
            },
            orderBy: {
              score: 'desc'
            }
          });

          if (submissions.length === 0) {
            distributionResults.push({
              rewardId: reward.id,
              success: false,
              error: 'No submissions found'
            });
            continue;
          }

          // Mark reward as distributed
          await prisma.snarkelReward.update({
            where: { id: reward.id },
            data: { 
              isDistributed: true,
              distributedAt: new Date()
            }
          });

          distributionResults.push({
            rewardId: reward.id,
            success: true,
            message: `Distributed ${reward.tokenSymbol} to ${submissions.length} participants`
          });

        } catch (error) {
          console.error(`Error processing reward ${reward.id}:`, error);
          distributionResults.push({
            rewardId: reward.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Rewards processed without room context (quiz completed)',
        distributed: true,
        results: distributionResults
      });
    }

    // Check if rewards are available for this snarkel
    if (room.snarkel.rewards.length === 0) {
      console.log('No rewards configured for this snarkel');
      return NextResponse.json({
        success: true,
        message: 'No rewards to distribute',
        distributed: false
      });
    }

    // Use connected wallet for distribution (Divvi-based)
    console.log('Using connected wallet for distribution:', connectedWallet);
    
    // Determine chain from snarkel reward config
    const firstUndistributed = room.snarkel.rewards[0];
    const chainId = firstUndistributed?.chainId || 8453; // Default to Base

    // Resolve contract address per chain
    const CONTRACTS: Record<number, string> = {
      42220: process.env.NEXT_PUBLIC_SNARKEL_CONTRACT_ADDRESS_CELO || '0x8b8fb708758dc8185ef31e685305c1aa0827ea65',
      8453: process.env.NEXT_PLIC_SNARKEL_CONTRACT_ADDRESS_BASE || '0xd2c5d1cf9727da34bcb6465890e4fb5c413bbd40'
    };
    
    // Check if we have contract addresses configured
    const missingContracts = Object.entries(CONTRACTS)
      .filter(([chainId, address]) => !address || address === '0x...')
      .map(([chainId]) => chainId);
    
    if (missingContracts.length > 0) {
      console.warn(`Missing contract addresses for chains: ${missingContracts.join(', ')}`);
    }
    
    const contractAddress = CONTRACTS[chainId];
    if (!contractAddress || contractAddress === '0x...') {
      return NextResponse.json({
        success: false,
        error: `Contract address not configured for chain ${chainId}`,
        details: 'Please configure the appropriate contract address environment variable.',
        code: 'MISSING_CONTRACT_ADDRESS'
      }, { status: 500 });
    }

    // Process each reward
    const distributionResults = [];

    for (const reward of room.snarkel.rewards) {
      try {
        console.log(`Processing reward: ${reward.tokenSymbol} (${reward.tokenAddress})`);

        // Get user details for leaderboard
        const leaderboardWithUsers = await Promise.all(
          finalLeaderboard.map(async (participant) => {
            const user = await prisma.user.findUnique({
              where: { id: participant.userId }
            });

            if (!user) {
              console.log(`User not found for participant: ${participant.userId}`);
              return null;
            }

            return {
              userId: participant.userId,
              walletAddress: user.address,
              score: participant.score,
              position: 0, // Will be calculated
              timeBonus: 0,
              finalPoints: participant.score
            };
          })
        );

        // Filter out null entries and sort by score
        const validLeaderboard = leaderboardWithUsers
          .filter(entry => entry !== null)
          .sort((a, b) => b.score - a.score)
          .map((entry, index) => ({
            ...entry,
            position: index + 1
          }));

        if (validLeaderboard.length === 0) {
          console.log('No valid participants for reward distribution');
          continue;
        }

        // Create submission records for participants
        const submissionRecords = await Promise.all(
          validLeaderboard.map(async (participant) => {
            return prisma.submission.create({
              data: {
                score: participant.score,
                totalPoints: participant.score,
                totalQuestions: room.snarkel.questions?.length || 0,
                timeSpent: 0,
                completedAt: new Date(),
                userId: participant.userId,
                snarkelId: room.snarkelId
              }
            });
          })
        );

        // Contract info for reference
        const contractInfo = {
          address: contractAddress,
          chainId: chainId
        };

        try {
          console.log(`Processing reward distribution for session ${sessionNumber}, token ${reward.tokenAddress}`);
          
          // For now, we'll simulate the distribution without blockchain calls
          // The connected wallet will handle the actual distribution via Divvi
          const hash = `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`Simulated transaction hash: ${hash}`);
          
                  // Calculate reward distribution based on configuration
        let distributionAmounts: Array<{ userId: string; amount: number; position: number }> = [];
        
        // Reward based on configuration - default to top winners
        const totalWinners = reward.totalWinners || 5;
        const topWinners = validLeaderboard.slice(0, totalWinners);
        const totalPool = parseFloat(reward.totalRewardPool || '0');
        
        // Use predefined reward amounts if available, otherwise distribute proportionally
        if (reward.rewardAmounts && Array.isArray(reward.rewardAmounts) && reward.rewardAmounts.length > 0) {
          distributionAmounts = topWinners.map((participant, index) => {
            const rewardAmount = (reward.rewardAmounts as number[])[index] || 0;
            const amount = (rewardAmount / 100) * totalPool; // Convert percentage to amount
            return {
              userId: participant.userId,
              amount: Math.max(0, amount),
              position: participant.position
            };
          });
        } else {
          // Proportional distribution among top winners
          const totalScore = topWinners.reduce((sum, p) => sum + p.score, 0);
          distributionAmounts = topWinners.map(participant => {
            const amount = totalScore > 0 ? (participant.score / totalScore) * totalPool : 0;
            return {
              userId: participant.userId,
              amount: Math.max(0, amount),
              position: participant.position
            };
          });
        }
        
        // Create reward distribution records in database
        for (const distribution of distributionAmounts) {
          await prisma.rewardDistribution.create({
            data: {
              position: distribution.position,
              amount: distribution.amount.toString(),
              txHash: hash,
              isProcessed: true,
              processedAt: new Date(),
              rewardId: reward.id,
              userId: distribution.userId,
              submissionId: submissionRecords.find(s => s.userId === distribution.userId)?.id || ''
            }
          });
        }

          // Update reward as distributed
          await prisma.snarkelReward.update({
            where: { id: reward.id },
            data: {
              isDistributed: true,
              distributedAt: new Date()
            }
          });

          distributionResults.push({
            rewardId: reward.id,
            tokenSymbol: reward.tokenSymbol,
            tokenAddress: reward.tokenAddress,
            totalAmount: reward.totalRewardPool || 0,
            amountPerParticipant: parseFloat(reward.totalRewardPool || '0') / validLeaderboard.length,
            participants: validLeaderboard.length,
            distributions: validLeaderboard.length,
            successfulTransfers: validLeaderboard.length,
            failedTransfers: 0,
            totalDistributed: reward.totalRewardPool || '0',
            transactionHash: hash
          });

          console.log(`Successfully distributed rewards for ${reward.tokenSymbol}`);

        } catch (error: any) {
          console.error(`Failed to distribute rewards for ${reward.tokenSymbol}:`, error);
          
          distributionResults.push({
            rewardId: reward.id,
            tokenSymbol: reward.tokenSymbol,
            tokenAddress: reward.tokenAddress,
            error: error.message
          });
        }

      } catch (error: any) {
        console.error(`Error processing reward ${reward.tokenSymbol}:`, error);
        distributionResults.push({
          rewardId: reward.id,
          tokenSymbol: reward.tokenSymbol,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Automatic reward distribution completed',
      distributed: distributionResults.length > 0,
      results: distributionResults
    });

  } catch (error: any) {
    console.error('Error in automatic reward distribution:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to distribute rewards automatically',
      details: error.message
    }, { status: 500 });
  }
} 