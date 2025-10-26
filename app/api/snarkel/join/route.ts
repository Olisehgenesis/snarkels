import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { snarkelCode, skipVerification, userAddress } = await request.json();

    if (!snarkelCode) {
      return NextResponse.json(
        { error: 'Snarkel code is required' },
        { status: 400 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Find or create user by wallet address
    let user = await prisma.user.findUnique({
      where: { address: userAddress }
    });

    if (!user) {
      // Create a basic user record if they don't exist
      user = await prisma.user.create({
        data: {
          address: userAddress,
          isVerified: false,
          verificationMethod: null,
          verifiedAt: null,
        }
      });
    }

    // Find the snarkel
    const snarkel = await prisma.snarkel.findFirst({
      where: { snarkelCode: snarkelCode },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        creator: true
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { 
          error: 'Snarkel not found',
          success: false 
        },
        { status: 404 }
      );
    }

    if (!snarkel.isActive) {
      return NextResponse.json(
        { 
          error: 'This snarkel is not active',
          success: false 
        },
        { status: 400 }
      );
    }

    // Check if verification is required
    if (snarkel.requireVerification && !skipVerification) {
      if (!user.isVerified) {
        return NextResponse.json({
          verificationRequired: true,
          snarkelId: snarkel.id,
          message: 'This snakel requires identity verification',
          success: false
        });
      }
    }

    // Check if user is already a participant
    const existingParticipant = snarkel.participants.find(
      p => p.user.address === userAddress
    );

    if (existingParticipant) {
      // User is already a participant, find or create a room for them
      let room = await prisma.room.findFirst({
        where: { 
          snarkelId: snarkel.id,
          isActive: true,
          isWaiting: true,
          isFinished: false
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('Existing participant - session lookup:', {
        roomFound: !!room,
        roomId: room?.id,
        sessionNumber: room?.sessionNumber,
        roomAdminId: room?.adminId,
        userId: user.id
      });

      if (!room) {
        // Create a new session for existing participant
        console.log('Creating new session for existing participant:', {
          userId: user.id,
          userAddress: user.address,
          snarkelId: snarkel.id
        });
        
        // Get the next session number for this snarkel
        const lastRoom = await prisma.room.findFirst({
          where: { snarkelId: snarkel.id },
          orderBy: { sessionNumber: 'desc' }
        });
        
        const nextSessionNumber = (lastRoom?.sessionNumber || 0) + 1;
        
        room = await prisma.room.create({
          data: {
            snarkelId: snarkel.id,
            name: `${snarkel.title} - Session ${nextSessionNumber}`,
            adminId: user.id,
            currentParticipants: 1,
            maxParticipants: 50,
            minParticipants: 1,
            isActive: true,
            isWaiting: true,
            sessionNumber: nextSessionNumber
          }
        });

        console.log('New session created for existing participant:', {
          roomId: room.id,
          adminId: room.adminId,
          expectedAdminId: user.id,
          sessionNumber: nextSessionNumber
        });

        // Add user to room as admin
        const roomParticipant = await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: user.id,
            isReady: false,
            isAdmin: true
          }
        });

        console.log('Session admin added for existing participant:', {
          participantId: roomParticipant.id,
          userId: roomParticipant.userId,
          expectedUserId: user.id
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Already a participant in this snarkel',
        snarkelId: snarkel.id,
        roomId: room.id,
        participant: existingParticipant,
        alreadyParticipant: true
      });
    }

    // Check if max participants reached
    if (snarkel.maxParticipants && snarkel.participants.length >= snarkel.maxParticipants) {
      return NextResponse.json({
        error: 'Maximum participants reached for this snarkel',
        success: false
      }, { status: 400 });
    }

    // Add user as participant
    const participant = await prisma.participant.create({
      data: {
        snarkelId: snarkel.id,
        userId: user.id,
        joinedAt: new Date(),
        points: 0
      }
    });

        // Find or create a room for the new participant
    // Strategy: Look for active rooms first, create new session only if needed
    let room = await prisma.room.findFirst({
      where: { 
        snarkelId: snarkel.id,
        isActive: true,
        isWaiting: true, // Only join rooms that are waiting for participants
        isFinished: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!room) {
      // No active waiting room found - create a new session
      console.log('Creating new session/room:', {
        userId: user.id,
        userAddress: user.address,
        snarkelId: snarkel.id
      });
      
      // Get the next session number for this snarkel
      const lastRoom = await prisma.room.findFirst({
        where: { snarkelId: snarkel.id },
        orderBy: { sessionNumber: 'desc' }
      });
      
      const nextSessionNumber = (lastRoom?.sessionNumber || 0) + 1;
      
      try {
        room = await prisma.room.create({
          data: {
            snarkelId: snarkel.id,
            name: `${snarkel.title} - Session ${nextSessionNumber}`,
            adminId: user.id,
            currentParticipants: 1,
            maxParticipants: 50,
            minParticipants: 1,
            isActive: true,
            isWaiting: true,
            sessionNumber: nextSessionNumber
          }
        });

        console.log('New session created successfully:', {
          roomId: room.id,
          adminId: room.adminId,
          expectedAdminId: user.id,
          sessionNumber: nextSessionNumber
        });

        // Add user to room as admin
        const roomParticipant = await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: user.id,
            isReady: false,
            isAdmin: true
          }
        });

        console.log('Session admin added:', {
          participantId: roomParticipant.id,
          userId: roomParticipant.userId,
          expectedUserId: user.id
        });
      } catch (error) {
        console.error('Error creating new session:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new Error(`Failed to create new session: ${errorMessage}`);
      }
    } else {
      // Join existing active session
      console.log('Joining existing session:', {
        roomId: room.id,
        sessionNumber: room.sessionNumber,
        roomAdminId: room.adminId,
        currentParticipants: room.currentParticipants,
        maxParticipants: room.maxParticipants
      });
      
      // Check if room is full
      if (room.currentParticipants >= room.maxParticipants) {
        throw new Error('This session is full. Please wait for a new session to start.');
      }
      
      // Check if user is already in this session
      const existingRoomParticipant = await prisma.roomParticipant.findFirst({
        where: {
          roomId: room.id,
          userId: user.id
        }
      });

      if (!existingRoomParticipant) {
        // Add user to existing session
        const roomParticipant = await prisma.roomParticipant.create({
          data: {
            roomId: room.id,
            userId: user.id,
            isReady: false,
            isAdmin: false
          }
        });

        console.log('User added to existing session:', {
          participantId: roomParticipant.id,
          userId: roomParticipant.userId,
          expectedUserId: user.id
        });

        // Update session participant count
        await prisma.room.update({
          where: { id: room.id },
          data: {
            currentParticipants: room.currentParticipants + 1
          }
        });
      } else {
        console.log('User already in this session:', {
          roomId: room.id,
          participantId: existingRoomParticipant.id,
          isAdmin: existingRoomParticipant.isAdmin
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined snarkel',
      snarkelId: snarkel.id,
      roomId: room.id,
      participant
    });

  } catch (error: any) {
    console.error('Join snarkel error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
} 