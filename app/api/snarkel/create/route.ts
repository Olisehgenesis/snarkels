import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateSnarkelCode, validateSnarkelSettings, validateRewardSettings } from '@/lib/snarkel-utils';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      basePointsPerQuestion,
      maxSpeedBonus,
      speedBonusEnabled,
      maxQuestions,
      isPublic,
      allowlist,
      spamControlEnabled,
      entryFee,
      entryFeeToken,
      entryFeeNetwork,
      
      // Self Protocol verification
      requireVerification,
      
      creatorAddress,
      rewards,
      questions,
      startTime,
      autoStartEnabled,
      redCode,
      isFeatured,
      featuredPriority
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Validate wallet connection
    if (!creatorAddress) {
      return NextResponse.json(
        { error: 'Wallet connection is required to create a snarkel' },
        { status: 401 }
      );
    }

    // Validate start time if provided
    if (startTime) {
      const startTimeDate = new Date(startTime);
      const now = new Date();
      
      if (isNaN(startTimeDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid start time format' },
          { status: 400 }
        );
      }
      
      if (startTimeDate <= now) {
        return NextResponse.json(
          { error: 'Start time must be in the future' },
          { status: 400 }
        );
      }
    }

    // Validate auto-start settings
    if (autoStartEnabled && !startTime) {
      return NextResponse.json(
        { error: 'Start time is required when auto-start is enabled' },
        { status: 400 }
      );
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.text || question.text.trim() === '') {
        return NextResponse.json(
          { error: `Question ${i + 1} text is required` },
          { status: 400 }
        );
      }

      const validOptions = question.options.filter((opt: any) => opt.text && opt.text.trim() !== '');
      if (validOptions.length < 2) {
        return NextResponse.json(
          { error: `Question ${i + 1} needs at least 2 options` },
          { status: 400 }
        );
      }

      const correctOptions = validOptions.filter((opt: any) => opt.isCorrect);
      if (correctOptions.length === 0) {
        return NextResponse.json(
          { error: `Question ${i + 1} needs at least one correct answer` },
          { status: 400 }
        );
      }
    }

    // Validate snarkel settings
    const snarkelValidation = validateSnarkelSettings({
      title,
      basePointsPerQuestion,
      maxSpeedBonus,
      maxQuestions
    });

    if (!snarkelValidation.isValid) {
      return NextResponse.json(
        { error: snarkelValidation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Validate reward settings if enabled
    if (rewards.enabled) {
      const rewardValidation = validateRewardSettings(rewards);
      if (!rewardValidation.isValid) {
        return NextResponse.json(
          { error: rewardValidation.errors.join(', ') },
          { status: 400 }
        );
      }
    }

    // Generate unique snarkel code
    const snarkelCode = await generateSnarkelCode();

    // Find or create user based on wallet address
    let user = await prisma.user.findUnique({
      where: { address: creatorAddress.toLowerCase() }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: creatorAddress.toLowerCase(),
          name: `User ${creatorAddress.slice(0, 8)}...`,
          totalPoints: 0
        }
      });
    }

    // Create snarkel
    const snarkel = await prisma.snarkel.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        snarkelCode: redCode || snarkelCode, // Use red code if provided, otherwise generate
        startTime: startTime ? new Date(startTime) : null,
        autoStartEnabled: autoStartEnabled || false,
        basePointsPerQuestion,
        maxSpeedBonus,
        speedBonusEnabled,
        maxQuestions,
        isPublic,
        isActive: true,
        isFeatured: isFeatured || false,
        spamControlEnabled,
        entryFeeAmount: spamControlEnabled ? entryFee.toString() : '0',
        entryFeeTokenAddress: spamControlEnabled ? entryFeeToken : '',
        entryFeeNetwork: spamControlEnabled ? entryFeeNetwork : '',
        
        // Self Protocol verification
        requireVerification: requireVerification || false,
        
        rewardsEnabled: rewards.enabled || false,
        creatorId: user.id,
        questions: {
          create: questions.map((q: any, index: number) => ({
            text: q.text.trim(),
            order: index + 1,
            points: basePointsPerQuestion,
            timeLimit: q.timeLimit || 15,
            options: {
              create: q.options
                .filter((opt: any) => opt.text && opt.text.trim() !== '')
                .map((opt: any, optIndex: number) => ({
                  text: opt.text.trim(),
                  isCorrect: opt.isCorrect,
                  order: optIndex + 1
                }))
            }
          }))
        },
        allowlists: (!isPublic && allowlist && allowlist.length > 0) ? {
          create: allowlist.map((address: string) => ({
            address: address.trim()
          }))
        } : undefined,
        // Create featured content if marked as featured
        featuredContent: isFeatured ? {
          create: {
            priority: featuredPriority || 1,
            isActive: true
          }
        } : undefined
      },
      include: {
        questions: {
          include: {
            options: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        allowlists: true,
        featuredContent: true
      }
    });

    // Create reward settings if enabled
    if (rewards.enabled) {
      // Debug logging for rewards data
      console.log('=== REWARDS DEBUG ===');
      console.log('Rewards data received:', JSON.stringify(rewards, null, 2));
      console.log('Token symbol received:', rewards.tokenSymbol);
      console.log('Token name received:', rewards.tokenName);
      console.log('Token decimals received:', rewards.tokenDecimals);
      console.log('Network received:', rewards.network);
      console.log('Chain ID received:', rewards.chainId);
      
      // Get network name based on chain ID
      const getNetworkName = (chainId: number): string => {
        switch (chainId) {
          case 8453: return 'Base Mainnet';
          case 42220: return 'Celo Mainnet';
          default: return `Chain ${chainId}`;
        }
      };

      const rewardData = {
        rewardType: rewards.type,
        tokenAddress: rewards.tokenAddress,
        tokenSymbol: rewards.tokenSymbol && rewards.tokenSymbol.trim() !== '' ? rewards.tokenSymbol : 'TOKEN',
        tokenName: rewards.tokenName && rewards.tokenName.trim() !== '' ? rewards.tokenName : 'Reward Token',
        tokenDecimals: rewards.tokenDecimals && rewards.tokenDecimals > 0 ? rewards.tokenDecimals : 18,
        network: rewards.network && rewards.network.trim() !== '' ? rewards.network : getNetworkName(rewards.chainId),
        chainId: rewards.chainId,
        totalWinners: !rewards.rewardAllParticipants ? rewards.totalWinners : undefined,
        rewardAmounts: !rewards.rewardAllParticipants ? rewards.rewardAmounts : undefined,
        totalRewardPool: rewards.totalRewardPool,
        minParticipants: rewards.minParticipants,
        pointsWeight: rewards.pointsWeight,
        rewardAllParticipants: rewards.rewardAllParticipants || false,
        snarkelId: snarkel.id
      };
      
      console.log('Reward data to be saved:', JSON.stringify(rewardData, null, 2));

      await prisma.snarkelReward.create({
        data: rewardData
      });
    }

    // Link allowlist addresses to users if they exist
    if (!isPublic && allowlist.length > 0) {
      for (const address of allowlist) {
        const allowlistUser = await prisma.user.findUnique({
          where: { address: address.trim().toLowerCase() }
        });
        
        if (allowlistUser) {
          await prisma.snarkelAllowlist.updateMany({
            where: {
              snarkelId: snarkel.id,
              address: address.trim()
            },
            data: {
              userId: allowlistUser.id
            }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      snarkelCode: snarkel.snarkelCode,
      snarkel: {
        id: snarkel.id,
        title: snarkel.title,
        description: snarkel.description,
        startTime: snarkel.startTime,
        autoStartEnabled: snarkel.autoStartEnabled,
        totalQuestions: snarkel.questions.length,
        basePointsPerQuestion: snarkel.basePointsPerQuestion,
        speedBonusEnabled: snarkel.speedBonusEnabled,
        maxSpeedBonus: snarkel.maxSpeedBonus,
        isPublic: snarkel.isPublic,
        spamControlEnabled: snarkel.spamControlEnabled,
        entryFee: snarkel.entryFeeAmount,
        entryFeeToken: snarkel.entryFeeTokenAddress,
        allowlistCount: snarkel.allowlists.length,
        hasRewards: rewards.enabled,
        creator: {
          id: user.id,
          address: user.address,
          name: user.name
        }
      }
    });

  } catch (error: any) {
    console.error('Error creating snarkel:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Database constraint error. Please check your input and try again.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A snarkel with this title already exists. Please choose a different title.' },
        { status: 409 }
      );
    }
    
    // Handle other database errors
    if (error.code && error.code.startsWith('P')) {
      return NextResponse.json(
        { error: `Database error (${error.code}): ${error.message || 'Unknown database error'}` },
        { status: 500 }
      );
    }
    
    // Log the full error for debugging
    console.error('Full error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta
    });
    
    return NextResponse.json(
      { error: `Failed to create snarkel: ${error.message || 'Unknown error occurred'}` },
      { status: 500 }
    );
  }
} 