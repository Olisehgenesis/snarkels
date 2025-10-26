import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { snarkelId, error } = body;

    // Validate required fields
    if (!snarkelId) {
      return NextResponse.json(
        { error: 'Snarkel ID is required' },
        { status: 400 }
      );
    }

    // Update the snarkel to mark blockchain setup as failed
    const updatedSnarkel = await prisma.snarkel.update({
      where: { id: snarkelId },
      data: {
        rewardsEnabled: false, // Disable rewards since blockchain setup failed
        onchainSessionId: null // Clear any onchain session ID
      }
    });

    // Log the blockchain failure for debugging
    console.log(`Blockchain setup failed for snarkel ${snarkelId}:`, error);

    return NextResponse.json({
      success: true,
      message: 'Snarkel marked as blockchain setup failed',
      snarkel: {
        id: updatedSnarkel.id,
        snarkelCode: updatedSnarkel.snarkelCode,
        rewardsEnabled: updatedSnarkel.rewardsEnabled
      }
    });

  } catch (error: any) {
    console.error('Error marking blockchain setup as failed:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to mark blockchain setup as failed. Please try again.' },
      { status: 500 }
    );
  }
}
