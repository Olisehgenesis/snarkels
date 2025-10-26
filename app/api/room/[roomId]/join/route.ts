import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';
import { isValidWalletAddress } from '@/lib/wallet-utils';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Enhanced wallet address validation
    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Find the room with creator information
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: {
          include: {
            creator: true, // Include the snarkel creator
            questions: {
              select: {
                id: true
              }
            }
          }
        },
        admin: true, // Include room admin
        participants: {
          include: {
            user: true
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    // Check if room is active
    if (!room.isActive) {
      return NextResponse.json(
        { error: 'This room is not active' },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: walletAddress.toLowerCase() }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: walletAddress.toLowerCase(),
          name: `User ${walletAddress.slice(0, 8)}...`,
          totalPoints: 0
        }
      });
    }

    console.log('User lookup:', {
      walletAddress: walletAddress.toLowerCase(),
      userFound: !!user,
      userId: user?.id,
      userAddress: user?.address
    });

    // **ENHANCED ADMIN CHECK**: Check if user is the snarkel creator OR room admin OR if it's the first person joining a featured quiz (session starter)
    // Also check if the user ID matches the room admin ID for additional verification
    const isSnarkelCreator = room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase();
    const isRoomAdmin = room.admin.address.toLowerCase() === walletAddress.toLowerCase();
    const isAdminById = room.adminId === user.id;
    const isFeaturedQuiz = room.snarkel.isFeatured;
    const isFirstPersonJoiningFeatured = isFeaturedQuiz && room.currentParticipants === 0;
    
    const isAdmin = isSnarkelCreator || isRoomAdmin || isAdminById || isFirstPersonJoiningFeatured;

    console.log('Admin check details:', {
      walletAddress: walletAddress.toLowerCase(),
      snarkelCreatorAddress: room.snarkel.creator.address.toLowerCase(),
      roomAdminAddress: room.admin.address.toLowerCase(),
      roomAdminId: room.adminId,
      snarkelCreatorId: room.snarkel.creatorId,
      userId: user.id,
      isSnarkelCreator,
      isRoomAdmin,
      isAdminById,
      isAdmin,
      adminMatchesCreator: room.adminId === room.snarkel.creatorId
    });

    // Additional debugging
    console.log('Room Join API - Admin Check:', {
      walletAddress: walletAddress.toLowerCase(),
      snarkelCreatorAddress: room.snarkel.creator.address.toLowerCase(),
      roomAdminAddress: room.admin.address.toLowerCase(),
      roomAdminId: room.adminId,
      userId: user.id,
      isSnarkelCreator,
      isRoomAdmin,
      isAdminById,
      isAdmin,
      roomId
    });

    console.log('Admin Check Details:', {
      walletAddress: walletAddress.toLowerCase(),
      snarkelCreator: room.snarkel.creator.address.toLowerCase(),
      roomAdmin: room.admin.address.toLowerCase(),
      isAdmin,
      roomId
    });

    // Check if user is already in the room
    const existingParticipant = room.participants.find(
      p => p.user.address.toLowerCase() === walletAddress.toLowerCase()
    );

    console.log('Room participant lookup debug:', {
      walletAddress: walletAddress.toLowerCase(),
      userLookupId: user.id,
      roomParticipants: room.participants.map(p => ({
        participantId: p.id,
        participantUserId: p.userId,
        participantUserAddress: p.user.address.toLowerCase(),
        isAdmin: p.isAdmin
      })),
      existingParticipantFound: !!existingParticipant
    });

    console.log('Existing participant check:', {
      walletAddress: walletAddress.toLowerCase(),
      existingParticipantFound: !!existingParticipant,
      existingParticipantId: existingParticipant?.id,
      existingParticipantIsAdmin: existingParticipant?.isAdmin,
      allParticipantAddresses: room.participants.map(p => p.user.address.toLowerCase()),
      allParticipantDetails: room.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        address: p.user.address.toLowerCase(),
        isAdmin: p.isAdmin,
        name: p.user.name
      }))
    });

    if (existingParticipant) {
      console.log('Processing existing participant:', {
        existingParticipantId: existingParticipant.id,
        existingIsAdmin: existingParticipant.isAdmin,
        shouldBeAdmin: isAdmin || isSnarkelCreator
      });

      // Update admin status if needed
      if (isAdmin && !existingParticipant.isAdmin) {
        console.log('Updating existing participant to admin');
        const updatedParticipant = await prisma.roomParticipant.update({
          where: { id: existingParticipant.id },
          data: { isAdmin: true }
        });
        console.log('Updated participant:', updatedParticipant);
      }
      
      // If user is snarkel creator but not marked as admin, update them
      if (isSnarkelCreator && !existingParticipant.isAdmin) {
        console.log('Updating existing participant to admin (snarkel creator)');
        const updatedParticipant = await prisma.roomParticipant.update({
          where: { id: existingParticipant.id },
          data: { isAdmin: true }
        });
        console.log('Updated participant (snarkel creator):', updatedParticipant);
      }

      return NextResponse.json({
        success: true,
        roomId: room.id,
        room: {
          id: room.id,
          name: room.name,
          currentParticipants: room.currentParticipants,
          maxParticipants: room.maxParticipants,
          minParticipants: room.minParticipants,
          isWaiting: room.isWaiting,
          isStarted: room.isStarted,
          isFinished: room.isFinished,
          countdownDuration: room.countdownDuration,
          scheduledStartTime: room.scheduledStartTime?.toISOString() || null,
          actualStartTime: room.actualStartTime?.toISOString() || null,
          endTime: room.endTime?.toISOString() || null,
          sessionNumber: room.sessionNumber || 1,
          autoStartEnabled: room.autoStartEnabled || false
        },
        snarkel: {
          id: room.snarkel.id,
          title: room.snarkel.title,
          description: room.snarkel.description,
          totalQuestions: room.snarkel.questions.length,
          basePointsPerQuestion: room.snarkel.basePointsPerQuestion,
          speedBonusEnabled: room.snarkel.speedBonusEnabled,
          maxSpeedBonus: room.snarkel.maxSpeedBonus,
          startTime: room.snarkel.startTime?.toISOString() || null,
          autoStartEnabled: room.snarkel.autoStartEnabled || false
        },
        participants: room.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          isAdmin: p.userId === user.id ? (isAdmin || isSnarkelCreator) : p.isAdmin, // Update admin status
          isReady: p.isReady,
          joinedAt: p.joinedAt.toISOString(),
          user: {
            id: p.user.id,
            address: p.user.address,
            name: p.user.name || ''
          }
        })),
        isAdmin: isAdmin || isSnarkelCreator,
        isReady: existingParticipant.isReady,
        adminAddress: room.admin.address,
        snarkelCreatorAddress: room.snarkel.creator.address,
        message: 'Already in room'
      });

      console.log('Response for existing participant:', {
        isAdmin: isAdmin || isSnarkelCreator,
        adminAddress: room?.admin?.address,
        snarkelCreatorAddress: room?.snarkel?.creator?.address,
        roomScheduledStartTime: room?.scheduledStartTime,
        snarkelStartTime: room?.snarkel?.startTime
      });
    }

    // Check if room is full
    if (room.currentParticipants >= room.maxParticipants) {
      return NextResponse.json(
        { error: 'Room is full' },
        { status: 400 }
      );
    }
    
    // Add user to room
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: user.id,
        isReady: false,
        isAdmin: isAdmin
      },
      include: {
        user: true
      }
    });

    // If user is snarkel creator but not marked as admin, update them
    if (isSnarkelCreator && !isAdmin) {
      await prisma.roomParticipant.update({
        where: { id: participant.id },
        data: { isAdmin: true }
      });
      participant.isAdmin = true;
    }

    // Update room participant count
    await prisma.room.update({
      where: { id: room.id },
      data: {
        currentParticipants: room.currentParticipants + 1
      }
    });

    // Get updated participants list
    const updatedParticipants = await prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      include: {
        user: true
      }
    });

        return NextResponse.json({
      success: true,
      roomId: room.id,
      room: {
        id: room.id,
        name: room.name,
        currentParticipants: room.currentParticipants + 1,
        maxParticipants: room.maxParticipants,
        minParticipants: room.minParticipants,
        isWaiting: room.isWaiting,
        isStarted: room.isStarted,
        isFinished: room.isFinished,
        countdownDuration: room.countdownDuration,
        scheduledStartTime: room.scheduledStartTime?.toISOString() || null,
        actualStartTime: room.actualStartTime?.toISOString() || null,
        endTime: room.endTime?.toISOString() || null,
        sessionNumber: room.sessionNumber || 1,
        autoStartEnabled: room.autoStartEnabled || false
      },
      snarkel: {
        id: room.snarkel.id,
        title: room.snarkel.title,
        description: room.snarkel.description,
        totalQuestions: room.snarkel.questions.length,
        basePointsPerQuestion: room.snarkel.basePointsPerQuestion,
        speedBonusEnabled: room.snarkel.speedBonusEnabled,
        maxSpeedBonus: room.snarkel.maxSpeedBonus,
        startTime: room.snarkel.startTime?.toISOString() || null,
        autoStartEnabled: room.snarkel.autoStartEnabled || false
      },
      participants: updatedParticipants.map(p => ({
        id: p.id,
        userId: p.userId,
        isAdmin: p.userId === user.id ? (p.isAdmin || isSnarkelCreator) : p.isAdmin,
        isReady: p.isReady,
        joinedAt: p.joinedAt.toISOString(),
        user: {
          id: p.user.id,
          address: p.user.address,
          name: p.user.name || ''
        }
      })),
      isAdmin: participant.isAdmin || isSnarkelCreator,
      isReady: participant.isReady,
      adminAddress: room.admin.address,
      snarkelCreatorAddress: room.snarkel.creator.address,
      message: 'Successfully joined room'
    });

    console.log('Response for new participant:', {
      isAdmin: participant.isAdmin || isSnarkelCreator,
      adminAddress: room?.admin?.address,
      snarkelCreatorAddress: room?.snarkel?.creator?.address
    });

  } catch (error: any) {
    console.error('Error joining room:', error);
    
    return NextResponse.json(
      { error: 'Failed to join room' },
      { status: 500 }
    );
  }
}