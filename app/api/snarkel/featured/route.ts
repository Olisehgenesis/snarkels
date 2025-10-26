import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/index';
import { getFeaturedSnarkels } from '@/lib/snarkel-utils';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const featuredSnarkels = await getFeaturedSnarkels(limit);

    const response = featuredSnarkels.map((snarkel: any) => {
      // Calculate difficulty based on question count and time limits
      const totalQuestions = snarkel._count.questions;
      const avgTimePerQuestion = snarkel.questions?.[0]?.timeLimit || 15;
      let difficulty = 'Easy';
      if (totalQuestions > 20 || avgTimePerQuestion < 10) {
        difficulty = 'Hard';
      } else if (totalQuestions > 10 || avgTimePerQuestion < 12) {
        difficulty = 'Medium';
      }

      // Calculate estimated duration
      const estimatedDuration = Math.ceil((totalQuestions * avgTimePerQuestion) / 60);
      const durationText = estimatedDuration <= 1 ? '1 min' : `${estimatedDuration} min`;

      // Get reward information
      const rewardInfo = snarkel.rewardsEnabled ? {
        tokenSymbol: snarkel.rewardTokenSymbol || 'CELO',
        tokenName: snarkel.rewardTokenName || 'Celo',
        totalRewardPool: snarkel.totalRewardPool || '0',
        rewardPerPoint: snarkel.rewardPerPoint || '0'
      } : null;

      // Calculate participant count with proper formatting
      const participantCount = snarkel._count.submissions;
      const formattedParticipants = participantCount >= 1000 
        ? `${(participantCount / 1000).toFixed(1)}k` 
        : participantCount.toString();

      return {
        id: snarkel.id,
        title: snarkel.title,
        description: snarkel.description || 'Test your knowledge and earn rewards!',
        snarkelCode: snarkel.snarkelCode,
        creator: snarkel.creator.address,
        totalQuestions: totalQuestions,
        totalParticipants: participantCount,
        formattedParticipants: formattedParticipants,
        isActive: snarkel.isActive,
        startTime: snarkel.startTime,
        costCelo: snarkel.costCelo,
        spamControlEnabled: snarkel.spamControlEnabled,
        entryFee: snarkel.spamControlEnabled ? {
          amount: snarkel.entryFeeAmount,
          symbol: snarkel.entryFeeTokenSymbol
        } : null,
        priority: snarkel.featuredContent?.priority || 0,
        // Quiz card specific fields
        difficulty: difficulty,
        duration: durationText,
        category: 'Quiz', // Default category, could be enhanced later
        reward: rewardInfo ? {
          amount: rewardInfo.totalRewardPool,
          symbol: rewardInfo.tokenSymbol,
          name: rewardInfo.tokenName
        } : null,
        rewardsEnabled: snarkel.rewardsEnabled || false,
        basePointsPerQuestion: snarkel.basePointsPerQuestion,
        speedBonusEnabled: snarkel.speedBonusEnabled,
        maxSpeedBonus: snarkel.maxSpeedBonus
      };
    });

    return NextResponse.json({ featuredSnarkels: response });
  } catch (error) {
    console.error('Featured snarkels error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch featured snarkels' },
      { status: 500 }
    );
  }
} 