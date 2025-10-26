import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snarkelId: string }> }
) {
  try {
    // Await the params since they're now a Promise in newer Next.js versions
    const { snarkelId } = await params;

    // Get reward distribution status
    const reward = await prisma.snarkelReward.findFirst({
      where: { snarkelId },
      include: {
        distributions: {
          include: {
            user: {
              select: {
                address: true,
                name: true
              }
            }
          },
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    if (!reward) {
      return NextResponse.json({
        success: false,
        error: 'No rewards found for this snarkel'
      }, { status: 404 });
    }

    // Calculate distribution statistics
    const totalDistributions = reward.distributions.length;
    const successfulDistributions = reward.distributions.filter(d => d.isProcessed).length;
    const failedDistributions = totalDistributions - successfulDistributions;
    const totalAmount = reward.distributions.reduce((sum, d) => 
      sum + parseFloat(d.amount || '0'), 0
    );

    // Get room information
    const room = await prisma.room.findFirst({
      where: { snarkelId },
      orderBy: { createdAt: 'desc' }
    });

    const distributionStatus = {
      isDistributed: reward.isDistributed,
      distributedAt: reward.distributedAt,

      totalDistributions,
      successfulDistributions,
      failedDistributions,
      totalAmount: totalAmount.toString(),
      successRate: totalDistributions > 0 ? (successfulDistributions / totalDistributions) * 100 : 0,
      distributions: reward.distributions.map(dist => ({
        position: dist.position,
        participant: dist.user?.name || 'Unknown',
        walletAddress: dist.user?.address || 'Unknown',
        rewardAmount: dist.amount,
        transactionHash: dist.txHash,
        status: dist.isProcessed ? 'success' : 'failed',
        processedAt: dist.processedAt,
        error: dist.isProcessed ? undefined : 'Transaction failed or pending'
      })),
      roomInfo: room ? {
        isFinished: room.isFinished,
        endTime: room.endTime,
        totalParticipants: room.currentParticipants
      } : null
    };

    return NextResponse.json({
      success: true,
      data: distributionStatus
    });

  } catch (error: any) {
    console.error('Error fetching reward status:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch reward status'
    }, { status: 500 });
  }
}