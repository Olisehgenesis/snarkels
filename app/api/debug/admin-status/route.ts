import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';
import { isValidWalletAddress } from '@/lib/wallet-utils';

const prisma = new PrismaClient();

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

    // Find the room with all related data
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

    // Find the user
    const user = await prisma.user.findUnique({
      where: { address: walletAddress.toLowerCase() }
    });

    // Check admin status using both methods
    const isAdminByAddress = (
      room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase() ||
      room.admin.address.toLowerCase() === walletAddress.toLowerCase()
    );

    const isAdminById = user ? room.adminId === user.id : false;

    // Find participant record
    const participant = room.participants.find(
      p => p.user.address.toLowerCase() === walletAddress.toLowerCase()
    );

    return NextResponse.json({
      roomId,
      walletAddress,
      room: {
        id: room.id,
        name: room.name,
        adminId: room.adminId,
        snarkelId: room.snarkelId
      },
      snarkel: {
        id: room.snarkel.id,
        title: room.snarkel.title,
        creatorId: room.snarkel.creatorId,
        creatorAddress: room.snarkel.creator.address
      },
      admin: {
        id: room.admin.id,
        address: room.admin.address
      },
      user: user ? {
        id: user.id,
        address: user.address
      } : null,
      adminChecks: {
        isAdminByAddress,
        isAdminById,
        isSnarkelCreator: room.snarkel.creator.address.toLowerCase() === walletAddress.toLowerCase(),
        isRoomAdmin: room.admin.address.toLowerCase() === walletAddress.toLowerCase(),
        isAdminIdMatch: user ? room.adminId === user.id : false
      },
      participant: participant ? {
        id: participant.id,
        isAdmin: participant.isAdmin,
        isReady: participant.isReady,
        userId: participant.userId
      } : null,
      allParticipants: room.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        isAdmin: p.isAdmin,
        userAddress: p.user.address
      }))
    });

  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
} 