import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/index';
import { getRoomStatus, joinRoom, setParticipantReady } from '@/lib/snarkel-utils';

const prisma = new PrismaClient();

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const roomId = (await params).roomId;
    const roomStatus = await getRoomStatus(roomId);
    
    return NextResponse.json(roomStatus);
  } catch (error) {
    console.error('Room status error:', error);
    return NextResponse.json(
      { message: 'Failed to get room status' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const roomId = (await params).roomId;
    const { userId, action, isReady } = await request.json();

    if (action === 'join') {
      const result = await joinRoom(roomId, userId);
      return NextResponse.json(result);
    } else if (action === 'ready') {
      const participant = await setParticipantReady(roomId, userId, isReady);
      return NextResponse.json({ participant });
    }

    return NextResponse.json(
      { message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Room action error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to perform room action' },
      { status: 500 }
    );
  }
} 