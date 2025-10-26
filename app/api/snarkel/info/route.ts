import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelCode } = body;

    if (!snarkelCode) {
      return NextResponse.json(
        { error: 'Snarkel code is required' },
        { status: 400 }
      );
    }

    // Find the snarkel by code
    const snarkel = await prisma.snarkel.findUnique({
      where: { snarkelCode },
      include: {
        questions: {
          select: {
            id: true
          }
        },
        creator: {
          select: {
            id: true,
            address: true,
            name: true
          }
        }
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }

    // Check if snarkel is active
    if (!snarkel.isActive) {
      return NextResponse.json(
        { error: 'This snarkel is not active' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      snarkel: {
        id: snarkel.id,
        title: snarkel.title,
        description: snarkel.description,
        snarkelCode: snarkel.snarkelCode,
        totalQuestions: snarkel.questions.length,
        basePointsPerQuestion: snarkel.basePointsPerQuestion,
        speedBonusEnabled: snarkel.speedBonusEnabled,
        maxSpeedBonus: snarkel.maxSpeedBonus,
        isPublic: snarkel.isPublic,
        startTime: snarkel.startTime,
        autoStartEnabled: snarkel.autoStartEnabled,
        creator: snarkel.creator
      }
    });

  } catch (error: any) {
    console.error('Error fetching snarkel info:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch snarkel information' },
      { status: 500 }
    );
  }
} 