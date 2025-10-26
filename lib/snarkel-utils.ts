import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

// Generate unique 6-character snarkel code
export async function generateSnarkelCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists: boolean;

  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existingSnarkel = await prisma.snarkel.findUnique({
      where: { snarkelCode: code }
    });
    exists = !!existingSnarkel;
  } while (exists);

  return code;
}

// Check if wallet is allowed to participate in snarkel
export async function isWalletAllowed(snarkelId: string, walletAddress: string): Promise<boolean> {
  const snarkel = await prisma.snarkel.findUnique({
    where: { id: snarkelId },
    include: { allowlists: true }
  });

  if (!snarkel) return false;

  // If snarkel is public, everyone is allowed
  if (snarkel.isPublic) return true;

  // Check if wallet is in allowlist
  const allowed = snarkel.allowlists.some((entry: any) => 
    entry.address.toLowerCase() === walletAddress.toLowerCase()
  );

  return allowed;
}

// Create or get room for a snarkel
export async function getOrCreateRoom(snarkelId: string, adminId: string): Promise<any> {
  let room = await prisma.room.findFirst({
    where: { snarkelId },
    include: {
      participants: {
        include: {
          user: true
        }
      },
      admin: true,
      snarkel: true
    }
  });

  if (!room) {
    const snarkel = await prisma.snarkel.findUnique({
      where: { id: snarkelId }
    });

    if (!snarkel) throw new Error('Snarkel not found');

    room = await prisma.room.create({
      data: {
        name: `${snarkel.title} Room`,
        description: snarkel.description,
        adminId,
        snarkelId,
        minParticipants: 1,
        autoStartEnabled: false,
        countdownDuration: 10
      },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        admin: true,
        snarkel: true
      }
    });

    // Add admin as first participant
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: adminId,
        isAdmin: true,
        isReady: true
      }
    });

    // Update participant count
    await prisma.room.update({
      where: { id: room.id },
      data: { currentParticipants: 1 }
    });
  }

  return room;
}

// Join room as participant
export async function joinRoom(roomId: string, userId: string): Promise<any> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: {
          user: true
        }
      }
    }
  });

  if (!room) throw new Error('Room not found');
  if (room.isFinished) throw new Error('Room is finished');
  if (room.currentParticipants >= room.maxParticipants) {
    throw new Error('Room is full');
  }

  // Check if user is already in room
  const existingParticipant = room.participants.find((p: any) => p.userId === userId);
  if (existingParticipant) {
    return { room, participant: existingParticipant };
  }

  // Add participant to room
  const participant = await prisma.roomParticipant.create({
    data: {
      roomId,
      userId,
      isAdmin: false,
      isReady: false
    },
    include: {
      user: true
    }
  });

  // Update participant count
  await prisma.room.update({
    where: { id: roomId },
    data: { currentParticipants: room.currentParticipants + 1 }
  });

  return { room, participant };
}

// Start room countdown
export async function startRoomCountdown(roomId: string, adminId: string): Promise<any> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { admin: true }
  });

  if (!room) throw new Error('Room not found');
  if (room.adminId !== adminId) throw new Error('Only admin can start countdown');
  if (room.isStarted) throw new Error('Room already started');
  if (room.currentParticipants < room.minParticipants) {
    throw new Error(`Need at least ${room.minParticipants} participants to start`);
  }

  // Update room to start countdown
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      isWaiting: false,
      actualStartTime: new Date(Date.now() + room.countdownDuration * 1000)
    },
    include: {
      participants: {
        include: {
          user: true
        }
      },
      admin: true,
      snarkel: true
    }
  });

  return updatedRoom;
}

// Start snarkel immediately (skip countdown)
export async function startSnarkelImmediately(roomId: string, adminId: string): Promise<any> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { admin: true }
  });

  if (!room) throw new Error('Room not found');
  if (room.adminId !== adminId) throw new Error('Only admin can start snarkel');
  if (room.isStarted) throw new Error('Room already started');

  // Update room to start immediately
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      isWaiting: false,
      isStarted: true,
      actualStartTime: new Date()
    },
    include: {
      participants: {
        include: {
          user: true
        }
      },
      admin: true,
      snarkel: true
    }
  });

  return updatedRoom;
}

// Get room status and participants
export async function getRoomStatus(roomId: string): Promise<any> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: {
          user: true
        }
      },
      admin: true,
      snarkel: true
    }
  });

  if (!room) throw new Error('Room not found');

  const timeUntilStart = room.actualStartTime 
    ? Math.max(0, room.actualStartTime.getTime() - Date.now())
    : 0;

  return {
    ...room,
    timeUntilStart,
    countdownActive: room.actualStartTime && !room.isStarted && timeUntilStart > 0
  };
}

// Set participant ready status
export async function setParticipantReady(roomId: string, userId: string, isReady: boolean): Promise<any> {
  const participant = await prisma.roomParticipant.update({
    where: {
      roomId_userId: {
        roomId,
        userId
      }
    },
    data: { isReady },
    include: {
      user: true,
      room: true
    }
  });

  return participant;
}

// Calculate points for an answer including speed bonus
export function calculateAnswerPoints(
  isCorrect: boolean,
  basePoints: number,
  timeToAnswer: number, // in milliseconds
  maxTimePerQuestion: number, // in milliseconds
  speedBonusEnabled: boolean,
  maxSpeedBonus: number
): number {
  if (!isCorrect) return 0;

  let points = basePoints;

  if (speedBonusEnabled && timeToAnswer < maxTimePerQuestion) {
    // Calculate speed bonus: faster answers get more bonus
    const timeRatio = timeToAnswer / maxTimePerQuestion;
    const speedBonus = Math.floor(maxSpeedBonus * (1 - timeRatio));
    points += speedBonus;
  }

  return points;
}

// Calculate quadratic rewards distribution
export function calculateQuadraticRewards(
  submissions: Array<{
    id: string;
    userId: string;
    totalPoints: number;
    score: number;
  }>,
  totalRewardPool: string,
  pointsWeight: number = 0.7
): Array<{
  submissionId: string;
  userId: string;
  position: number;
  amount: string;
}> {
  if (submissions.length === 0) return [];

  const totalPool = parseFloat(totalRewardPool);
  const participationWeight = 1 - pointsWeight;

  // Calculate quadratic scores
  const scores = submissions.map((sub, index) => {
    const participationScore = Math.sqrt(submissions.length - index); // Higher rank = higher participation score
    const pointsScore = Math.sqrt(sub.totalPoints); // Square root to reduce impact of very high scores
    
    const quadraticScore = (participationWeight * participationScore) + (pointsWeight * pointsScore);
    
    return {
      ...sub,
      quadraticScore,
      originalIndex: index
    };
  });

  // Sort by quadratic score
  scores.sort((a, b) => b.quadraticScore - a.quadraticScore);

  // Calculate total quadratic score
  const totalQuadraticScore = scores.reduce((sum, score) => sum + score.quadraticScore, 0);

  // Distribute rewards proportionally
  const distributions = scores.map((score, index) => {
    const proportion = score.quadraticScore / totalQuadraticScore;
    const amount = (totalPool * proportion).toFixed(6);
    
    return {
      submissionId: score.id,
      userId: score.userId,
      position: index + 1,
      amount
    };
  });

  return distributions;
}

// Calculate linear rewards distribution
export function calculateLinearRewards(
  submissions: Array<{
    id: string;
    userId: string;
    totalPoints: number;
  }>,
  rewardAmounts: number[],
  totalWinners: number
): Array<{
  submissionId: string;
  userId: string;
  position: number;
  amount: string;
}> {
  if (submissions.length === 0 || rewardAmounts.length === 0) return [];

  // Sort by total points (descending)
  const sortedSubmissions = submissions
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, totalWinners);

  return sortedSubmissions.map((submission, index) => ({
    submissionId: submission.id,
    userId: submission.userId,
    position: index + 1,
    amount: rewardAmounts[index]?.toString() || '0'
  }));
}

// Get featured snarkels for homepage
export async function getFeaturedSnarkels(limit: number = 10) {
  return await prisma.snarkel.findMany({
    where: {
      isFeatured: true,
      isActive: true,
      featuredContent: {
        isActive: true
      }
    },
    include: {
      creator: true,
      featuredContent: true,
      rooms: true,
      questions: {
        select: {
          timeLimit: true
        },
        take: 1,
        orderBy: {
          order: 'asc'
        }
      },
      _count: {
        select: {
          questions: true,
          submissions: true
        }
      }
    },
    orderBy: [
      { featuredContent: { priority: 'desc' } },
      { createdAt: 'desc' }
    ],
    take: limit
  });
}

// Calculate average time per question for speed bonus calculations
export function calculateAverageTimePerQuestion(timeSpent: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  return timeSpent / totalQuestions;
}

// Validate snarkel settings
export function validateSnarkelSettings(snarkel: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!snarkel.title || snarkel.title.trim().length < 3) {
    errors.push('Snarkel title must be at least 3 characters long');
  }

  if (snarkel.timeLimit && (snarkel.timeLimit < 1 || snarkel.timeLimit > 120)) {
    errors.push('Time limit must be between 1 and 120 minutes');
  }

  if (snarkel.basePointsPerQuestion < 100) {
    errors.push('Base points per question must be at least 100');
  }

  if (snarkel.maxSpeedBonus < 0) {
    errors.push('Maximum speed bonus cannot be negative');
  }

  if (snarkel.maxQuestions > 60) {
    errors.push('Maximum questions cannot exceed 60');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate reward settings
export function validateRewardSettings(rewards: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rewards.enabled) {
    return { isValid: true, errors: [] };
  }

  if (!rewards.tokenAddress || rewards.tokenAddress === '') {
    errors.push('Reward token is required');
  }

  if (rewards.type === 'LINEAR') {
    if (!rewards.totalWinners || rewards.totalWinners < 1) {
      errors.push('Total winners must be at least 1');
    }
    if (!rewards.rewardAmounts || rewards.rewardAmounts.length === 0) {
      errors.push('Reward amounts are required');
    }
  }

  if (rewards.type === 'QUADRATIC') {
    if (!rewards.totalRewardPool || parseFloat(rewards.totalRewardPool) <= 0) {
      errors.push('Total reward pool must be greater than 0');
    }
    if (!rewards.minParticipants || rewards.minParticipants < 1) {
      errors.push('Minimum participants must be at least 1');
    }
    if (rewards.pointsWeight < 0 || rewards.pointsWeight > 1) {
      errors.push('Points weight must be between 0 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format time in seconds to human readable format
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}

// Format points with appropriate suffix
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`;
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

// Calculate snarkel cost based on number of questions
export function calculateSnarkelCost(questionCount: number, costPerQuestion: number): number {
  const baseQuestions = Math.min(questionCount, 10);
  const extraQuestions = Math.max(0, questionCount - 10);
  return (baseQuestions * costPerQuestion) + (extraQuestions * 4);
}

// Generate snarkel summary statistics
export async function getSnarkelStats(snarkelId: string) {
  const snarkel = await prisma.snarkel.findUnique({
    where: { id: snarkelId },
    include: {
      questions: {
        orderBy: {
          order: 'asc'
        }
      },
      submissions: {
        where: {
          completedAt: { not: undefined }
        },
        orderBy: [
          { totalPoints: 'desc' },
          { timeSpent: 'asc' }
        ],
        take: 10,
        include: {
          user: true
        }
      }
    }
  });

  if (!snarkel) return null;

  // Get counts separately
  const questionCount = await prisma.question.count({
    where: { snarkelId }
  });

  const submissionCount = await prisma.submission.count({
    where: { snarkelId }
  });

  const totalParticipants = submissionCount;
  const averageScore = totalParticipants > 0 
    ? snarkel.submissions.reduce((sum: number, sub: any) => sum + sub.score, 0) / totalParticipants 
    : 0;
  
  const averageTime = totalParticipants > 0
    ? snarkel.submissions.reduce((sum: number, sub: any) => sum + (sub.timeSpent || 0), 0) / totalParticipants
    : 0;

  return {
    totalQuestions: questionCount,
    totalParticipants,
    averageScore: Math.round(averageScore * 100) / 100,
    averageTime: Math.round(averageTime),
    topParticipants: snarkel.submissions.map((sub: any, index: number) => ({
      rank: index + 1,
      address: sub.user.address,
      score: sub.score,
      totalPoints: sub.totalPoints,
      timeSpent: sub.timeSpent,
      percentage: Math.round((sub.score / sub.totalQuestions) * 100)
    }))
  };
} 