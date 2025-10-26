import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snarkelId: string }> }
) {
  try {
    const { snarkelId } = await params;

    if (!snarkelId) {
      return NextResponse.json(
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Fetch quiz information
    const quiz = await prisma.snarkel.findUnique({
      where: { id: snarkelId },
      select: {
        id: true,
        title: true,
        description: true,
        snarkelCode: true,
        maxQuestions: true,
        basePointsPerQuestion: true,
        speedBonusEnabled: true,
        maxSpeedBonus: true,

        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Fetch rooms for this quiz
    const rooms = await prisma.room.findMany({
      where: { snarkelId: snarkelId },
      select: {
        id: true,
        name: true,
        currentParticipants: true,
        maxParticipants: true,
        isActive: true,
        isWaiting: true,
        isStarted: true,
        isFinished: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      quiz,
      rooms
    });

  } catch (error) {
    console.error('Error fetching quiz data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
