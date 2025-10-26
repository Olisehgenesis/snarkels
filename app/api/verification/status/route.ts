import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, snarkelId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user verification status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isVerified: true,
        verificationMethod: true,
        verifiedAt: true,
        country: true,
        nationality: true,
        dateOfBirth: true,
        gender: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If no specific snarkel, just return user verification status
    if (!snarkelId) {
      return NextResponse.json({
        success: true,
        user: {
          ...user,
          canJoinQuizzes: user.isVerified,
        }
      });
    }

    // Get snarkel verification requirements
    const snarkel = await prisma.snarkel.findUnique({
      where: { id: snarkelId },
      select: {
        id: true,
        requireVerification: true,
        spamControlEnabled: true,
        entryFeeAmount: true,
        entryFeeTokenAddress: true,
      }
    });

    if (!snarkel) {
      return NextResponse.json(
        { error: 'Snarkel not found' },
        { status: 404 }
      );
    }

    // Check if user meets verification requirements
    let canJoin = true;
    let requirements = [];
    let missingRequirements = [];

    if (snarkel.requireVerification && !user.isVerified) {
      canJoin = false;
      missingRequirements.push('Identity verification required');
      requirements.push({
        type: 'verification',
        required: true,
        met: false,
        message: 'You must verify your identity to join this quiz'
      });
    } else if (snarkel.requireVerification && user.isVerified) {
      requirements.push({
        type: 'verification',
        required: true,
        met: true,
        message: 'Identity verification completed'
      });
    }







    // Check entry fee requirements
    if (snarkel.spamControlEnabled && snarkel.entryFeeAmount && parseFloat(snarkel.entryFeeAmount) > 0) {
      requirements.push({
        type: 'entryFee',
        required: true,
        met: true,
        message: `Entry fee: ${snarkel.entryFeeAmount} ${snarkel.entryFeeTokenAddress ? 'tokens' : 'ETH'}`
      });
    }

    return NextResponse.json({
      success: true,
      canJoin,
      user: {
        ...user,
        canJoinQuizzes: user.isVerified,
      },
      snarkel: {
        id: snarkel.id,
        requireVerification: snarkel.requireVerification,
        spamControlEnabled: snarkel.spamControlEnabled,
        entryFeeAmount: snarkel.entryFeeAmount,
        entryFeeTokenAddress: snarkel.entryFeeTokenAddress,
      },
      requirements,
      missingRequirements,
    });

  } catch (error: any) {
    console.error('Verification status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
