import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelId, adminAddress, rewards } = body;

    // Validate required fields
    if (!snarkelId || !adminAddress) {
      return NextResponse.json(
        { error: 'Snarkel ID and admin address are required' },
        { status: 400 }
      );
    }

    // Find the snarkel
    const snarkel = await prisma.snarkel.findUnique({
      where: { id: snarkelId },
      include: {
        rewards: true,
        questions: true
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }

    // Check if rewards are enabled - check both the flag and the actual rewards
    if (!snarkel.rewardsEnabled && snarkel.rewards.length === 0) {
      return NextResponse.json(
        { error: 'No rewards configured for this snarkel' },
        { status: 400 }
      );
    }

    // Find or create admin user
    let adminUser = await prisma.user.findUnique({
      where: { address: adminAddress.toLowerCase() }
    });

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          address: adminAddress.toLowerCase(),
          name: `Admin ${adminAddress.slice(0, 8)}...`,
          totalPoints: 0
        }
      });
    }

    // Create a new room session
    const room = await prisma.room.create({
      data: {
        name: `${snarkel.title} - Session 1`,
        description: `Quiz session with rewards enabled`,
        maxParticipants: 50,
        minParticipants: rewards.minParticipants || 3,
        autoStartEnabled: false, // Admin must start manually
        adminId: adminUser.id,
        snarkelId: snarkel.id,
        sessionNumber: 1,
        isActive: true,
        isWaiting: true,
        isStarted: false,
        isFinished: false
      }
    });

    // Add admin as first participant
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: adminUser.id,
        isReady: true,
        isAdmin: true
      }
    });

    // Update snarkel to mark it as having an active session
    await prisma.snarkel.update({
      where: { id: snarkelId },
      data: {
        isActive: true,
        onchainSessionId: room.id // Link the room as the session
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Quiz session created successfully',
      session: {
        id: room.id,
        name: room.name,
        sessionNumber: room.sessionNumber,
        adminAddress: adminAddress,
        minParticipants: room.minParticipants,
        maxParticipants: room.maxParticipants,
        isWaiting: room.isWaiting,
        rewards: snarkel.rewards.map(reward => ({
          tokenAddress: reward.tokenAddress,
          tokenSymbol: reward.tokenSymbol,
          totalRewardPool: reward.totalRewardPool,
          rewardAllParticipants: reward.rewardAllParticipants,
          totalWinners: reward.totalWinners
        }))
      }
    });

  } catch (error: any) {
    console.error('Error creating quiz session:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Database constraint error. Please check your input and try again.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A session with this configuration already exists.' },
        { status: 409 }
      );
    }
    
    // Handle other database errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json(
        { error: 'Database error occurred. Please try again.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create quiz session. Please try again.' },
      { status: 500 }
    );
  }
}
