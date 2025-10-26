import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';
import { isValidWalletAddress } from '@/lib/wallet-utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, walletAddress } = body;

    if (!roomId || !walletAddress) {
      return NextResponse.json(
        { error: 'Room ID and wallet address are required' },
        { status: 400 }
      );
    }

    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Find the room with creator and admin information
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: {
          include: {
            creator: true
          }
        },
        admin: true,
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

    // Check if the wallet address belongs to the snarkel creator or room admin
    const isAdmin = (
      room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase() ||
      room.admin.address.toLowerCase() === walletAddress.toLowerCase()
    );

    // Get admin participant record
    const adminParticipant = room.participants.find(
      p => p.user.address.toLowerCase() === walletAddress.toLowerCase() && p.isAdmin
    );

    return NextResponse.json({
      isAdmin,
      adminDetails: isAdmin ? {
        isSnarkelCreator: room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase(),
        isRoomAdmin: room.admin.address.toLowerCase() === walletAddress.toLowerCase(),
        participantRecord: adminParticipant || null
      } : null,
      room: {
        id: room.id,
        name: room.name,
        currentParticipants: room.currentParticipants,
        maxParticipants: room.maxParticipants,
        minParticipants: room.minParticipants,
        isWaiting: room.isWaiting,
        isStarted: room.isStarted,
        isFinished: room.isFinished,
        countdownDuration: room.countdownDuration
      },
      snarkel: {
        id: room.snarkel.id,
        title: room.snarkel.title,
        description: room.snarkel.description,
        creatorAddress: room.snarkel.creator.address
      }
    });

  } catch (error: any) {
    console.error('Error verifying admin:', error);
    return NextResponse.json(
      { error: 'Failed to verify admin status' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current admin status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const walletAddress = searchParams.get('walletAddress');

    if (!roomId || !walletAddress) {
      return NextResponse.json(
        { error: 'Room ID and wallet address are required' },
        { status: 400 }
      );
    }

    if (!isValidWalletAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        snarkel: {
          include: {
            creator: true
          }
        },
        admin: true
      }
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const isAdmin = (
      room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase() ||
      room.admin.address.toLowerCase() === walletAddress.toLowerCase()
    );

    return NextResponse.json({
      isAdmin,
      roomExists: true,
      roomStatus: {
        isWaiting: room.isWaiting,
        isStarted: room.isStarted,
        isFinished: room.isFinished
      }
    });

  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
} 