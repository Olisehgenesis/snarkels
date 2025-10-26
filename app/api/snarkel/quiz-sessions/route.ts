import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress } = body;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
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
        sessions: []
      });
    }

    // Fetch quiz sessions for snarkels created by this user
    const sessions = await prisma.room.findMany({
      where: {
        snarkel: {
          creatorId: user.id
        }
      },
      include: {
        snarkel: {
          select: {
            id: true,
            title: true,
            snarkelCode: true,
            rewards: {
              select: {
                id: true,
                isDistributed: true,
                distributedAt: true,
                onchainSessionId: true,
                network: true,
                chainId: true
              }
            }
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                address: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to match the frontend interface
    const transformedSessions = sessions.map(session => {
      const totalParticipants = session.participants.length;

      return {
        id: session.id,
        name: session.name,
        sessionNumber: session.sessionNumber,
        isActive: session.isActive,
        isWaiting: session.isWaiting,
        isStarted: session.isStarted,
        isFinished: session.isFinished,
        currentParticipants: session.currentParticipants,
        maxParticipants: session.maxParticipants,
        createdAt: session.createdAt.toISOString(),
        actualStartTime: session.actualStartTime?.toISOString() || null,
        endTime: session.endTime?.toISOString() || null,
        scheduledStartTime: session.scheduledStartTime?.toISOString() || null,
        snarkel: session.snarkel,
        participants: session.participants.map(p => ({
          id: p.id,
          address: p.user.address,
          name: p.user.name || '',
          joinedAt: p.joinedAt.toISOString(),
          isReady: p.isReady,
          isAdmin: p.isAdmin
        })),
        submissions: [], // No direct relation in Room model
        rewards: session.snarkel.rewards.map(r => ({
          id: r.id,
          isDistributed: r.isDistributed,
          distributedAt: r.distributedAt?.toISOString() || null,
          onchainSessionId: r.onchainSessionId,
          network: r.network,
          chainId: r.chainId,
          distributions: [] // No direct relation in Room model
        })),
        stats: {
          totalParticipants,
          totalSubmissions: 0,
          averageScore: 0,
          totalRewardsDistributed: 0,
          totalRewardAmount: '0'
        }
      };
    });

    return NextResponse.json({
      success: true,
      sessions: transformedSessions
    });
  } catch (error: any) {
    console.error('Error fetching quiz sessions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch quiz sessions',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 