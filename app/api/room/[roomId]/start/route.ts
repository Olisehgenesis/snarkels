import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { startRoomCountdown, startSnarkelImmediately } from '@/lib/snarkel-utils';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const roomId = (await params).roomId;
    const { adminId, startType } = await request.json();

    if (startType === 'countdown') {
      const room = await startRoomCountdown(roomId, adminId);
      return NextResponse.json({ 
        message: 'Countdown started',
        room,
        countdownDuration: room.countdownDuration
      });
    } else if (startType === 'immediate') {
      const room = await startSnarkelImmediately(roomId, adminId);
      return NextResponse.json({ 
        message: 'Snarkel started immediately',
        room
      });
    }

    return NextResponse.json(
      { message: 'Invalid start type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Room start error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to start room' },
      { status: 500 }
    );
  }
} 