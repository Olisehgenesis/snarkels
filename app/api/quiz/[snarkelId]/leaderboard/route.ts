import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snarkelId: string }> }
) {
  try {
    const { snarkelId } = await params;
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    console.log('🔍 API: Fetching leaderboard for snarkelId:', snarkelId);
    console.log('🔍 API: Wallet address:', walletAddress);

    if (!snarkelId) {
      return NextResponse.json(
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Fetch quiz information with rewards and creator
    const quiz = await prisma.snarkel.findFirst({
      where: { 
        OR: [
          { id: snarkelId },
          { snarkelCode: snarkelId }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            address: true,
            name: true
          }
        },
        questions: {
          select: {
            id: true,
            text: true,
            points: true,
            timeLimit: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        rewards: {
          where: {
            isDistributed: false
          },
          select: {
            id: true,
            tokenAddress: true,
            tokenSymbol: true,
            tokenName: true,
            totalRewardPool: true,
            isDistributed: true,
            distributedAt: true,
            totalWinners: true,
            rewardAmounts: true,
            minParticipants: true,
            network: true
          }
        }
      }
    });

    console.log('🔍 API: Quiz found:', !!quiz);
    if (quiz) {
      console.log('🔍 API: Quiz ID:', quiz.id);
      console.log('🔍 API: Quiz title:', quiz.title);
      console.log('🔍 API: Questions count:', quiz.questions.length);
    }

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Calculate max possible score from questions
    let maxPossibleScore = 0;
    if (quiz.questions.length > 0) {
      maxPossibleScore = quiz.questions.reduce((total: number, question: { points: number }) => total + question.points, 0);
    }

    // Fetch all submissions for this quiz with detailed answer information
    const submissions = await prisma.submission.findMany({
      where: {
        snarkelId: quiz.id,
        score: { gt: 0 } // Only include submissions with scores
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            isCorrect: true,
            timeToAnswer: true,
            pointsEarned: true,
            selectedOptions: true
          }
        }
      },
      orderBy: {
        score: 'desc'
      }
    });

    console.log('🔍 API: Submissions found:', submissions.length);
    console.log('🔍 API: Submissions with score > 0:', submissions.filter(s => s.score > 0).length);
    
    if (submissions.length > 0) {
      console.log('🔍 API: First submission score:', submissions[0].score);
      console.log('🔍 API: First submission user:', submissions[0].user?.name || submissions[0].user?.address);
    }

    // Debug: Check ALL submissions regardless of score
    const allSubmissions = await prisma.submission.findMany({
      where: {
        snarkelId: quiz.id
      },
      select: {
        id: true,
        score: true,
        userId: true,
        completedAt: true
      }
    });
    
    console.log('🔍 API: ALL submissions found:', allSubmissions.length);
    console.log('🔍 API: Submission scores:', allSubmissions.map(s => ({ id: s.id, score: s.score, userId: s.userId })));

    // Fetch questions with options for question breakdown
    const questions = await prisma.question.findMany({
      where: {
        snarkelId: quiz.id
      },
      include: {
        options: {
          select: {
            id: true,
            text: true,
            isCorrect: true
          }
        }
      }
    });

    // Process submissions to create enhanced leaderboard
    const leaderboard = submissions.map((submission: any, index) => {
      const correctAnswers = submission.answers.filter((answer: any) => answer.isCorrect).length;
      const totalQuestions = submission.answers.length;
      
      // Calculate average time per question
      const validTimes = submission.answers
        .filter((answer: any) => answer.timeToAnswer !== null)
        .map((answer: any) => answer.timeToAnswer!);
      
      const averageTimePerQuestion = validTimes.length > 0 
        ? validTimes.reduce((sum: number, time: number) => sum + time, 0) / validTimes.length
        : null;

      // Calculate time bonus (if applicable)
      let timeBonus = 0;
      if (quiz.basePointsPerQuestion && validTimes.length > 0) {
        // Simple time bonus calculation - can be enhanced based on your scoring logic
        const avgTime = averageTimePerQuestion || 0;
        if (avgTime < 10) { // Less than 10 seconds average
          timeBonus = Math.round(quiz.basePointsPerQuestion * 0.1); // 10% bonus
        }
      }

      // Create detailed question breakdown
      const questionBreakdown = submission.answers.map((answer: any) => {
        const question = questions.find(q => q.id === answer.questionId);
        return {
          questionId: answer.questionId,
          questionText: question?.text || 'Unknown Question',
          isCorrect: answer.isCorrect,
          pointsEarned: answer.pointsEarned || 0,
          timeToAnswer: answer.timeToAnswer,
          timeLimit: question?.timeLimit || 0,
          selectedOptions: answer.selectedOptions,
          correctOption: question?.options?.find((opt: any) => opt.isCorrect)?.text || 'Unknown',
          maxPoints: question?.points || 0
        };
      });

      return {
        userId: submission.user.id,
        name: submission.user.name || submission.user.address.slice(0, 6) + '...' + submission.user.address.slice(-4),
        score: submission.score,
        position: index + 1,
        walletAddress: submission.user.address,
        timeBonus,
        totalQuestions,
        correctAnswers,
        averageTimePerQuestion,
        completedAt: submission.completedAt.toISOString(),
        questionBreakdown,
        accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
      };
    });

    // Get total participants count
    const totalParticipants = await prisma.submission.count({
      where: {
        snarkelId: quiz.id,
        score: { gt: 0 }
      }
    });

    // Check if connected wallet is admin (quiz creator)
    let isAdmin = false;
    let adminDetails = null;
    
    if (walletAddress) {
      isAdmin = quiz.creator.address.toLowerCase() === walletAddress.toLowerCase();
      
      if (isAdmin) {
        adminDetails = {
          isQuizCreator: true,
          creatorAddress: quiz.creator.address,
          creatorName: quiz.creator.name
        };
      }
    }

    // Check if rewards are available and not distributed
    const hasRewards = quiz.rewards.length > 0;
    const undistributedRewards = quiz.rewards.filter((reward: any) => !reward.isDistributed);
    const canDistributeRewards = isAdmin && hasRewards && undistributedRewards.length > 0;

    // Prepare quiz info with enhanced data
    const quizInfo = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      snarkelCode: quiz.snarkelCode,
      maxPossibleScore,
      totalParticipants,
      hasRewards,
      rewards: quiz.rewards,
      canDistributeRewards,
      totalQuestions: quiz.questions.length,
      questions: quiz.questions
    };

    // Check if no submissions exist and provide helpful feedback
    if (allSubmissions.length === 0) {
      console.log('🔍 API: No submissions found, checking if quiz has been completed');
      
      // Check if there are any completed rooms for this snarkel
      const completedRooms = await prisma.room.findMany({
        where: {
          snarkelId: quiz.id,
          isFinished: true
        }
      });
      
      console.log('🔍 API: Completed rooms found:', completedRooms.length);
      
      if (completedRooms.length === 0) {
        console.log('🔍 API: No completed rooms found - quiz may not have been played yet');
        return NextResponse.json({
          success: true,
          leaderboard: [],
          quizInfo,
          isAdmin,
          adminDetails,
          message: 'This quiz has not been completed yet. No results available.',
          status: 'not_played'
        });
      } else {
        console.log('🔍 API: Quiz has been completed but no submissions exist - this indicates a data consistency issue');
        return NextResponse.json({
          success: true,
          leaderboard: [],
          quizInfo,
          isAdmin,
          adminDetails,
          message: 'Quiz has been completed but results are not available. This may be a temporary issue.',
          status: 'completed_no_submissions',
          completedRoomsCount: completedRooms.length
        });
      }
    }

    const response = {
      success: true,
      leaderboard,
      quizInfo,
      isAdmin,
      adminDetails
    };

    console.log('🔍 API: Final response:', {
      success: response.success,
      leaderboardLength: response.leaderboard.length,
      quizInfoId: response.quizInfo.id,
      isAdmin: response.isAdmin
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ snarkelId: string }> }
) {
  try {
    const { snarkelId } = await params;
    const body = await request.json();
    const { userAddress, action } = body;

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { address: userAddress.toLowerCase() }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find quiz
    const quiz = await prisma.snarkel.findFirst({
      where: { 
        OR: [
          { id: snarkelId },
          { snarkelCode: snarkelId }
        ]
      },
      include: {
        creator: { select: { id: true, address: true } }
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Check if user is admin (creator) of this quiz
    if (quiz.creator.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Only quiz creator can perform this action' },
        { status: 403 }
      );
    }

    if (action === 'create_submissions') {
      // Find completed rooms for this quiz
      const completedRooms = await prisma.room.findMany({
        where: {
          snarkelId: quiz.id,
          isFinished: true
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  address: true
                }
              }
            }
          }
        }
      });

      if (completedRooms.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No completed rooms found for this quiz'
        });
      }

      // Create submissions for all participants in completed rooms
      const submissionsCreated = [];
      
      for (const room of completedRooms) {
        for (const participant of room.participants) {
          // Check if submission already exists
          const existingSubmission = await prisma.submission.findFirst({
            where: {
              userId: participant.userId,
              snarkelId: quiz.id
            }
          });

          if (!existingSubmission) {
            // Create a basic submission (score will be 0 since we don't have actual game data)
            const submission = await prisma.submission.create({
              data: {
                score: 0, // Default score since we don't have actual game data
                totalPoints: 0,
                totalQuestions: 0, // Will be updated when we have question data
                timeSpent: 0,
                completedAt: room.endTime || new Date(),
                userId: participant.userId,
                snarkelId: quiz.id
              }
            });
            
            submissionsCreated.push({
              userId: participant.userId,
              userAddress: participant.user.address,
              submissionId: submission.id
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Created ${submissionsCreated.length} submissions for completed quiz`,
        submissionsCreated
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    });

  } catch (error) {
    console.error('Error in POST leaderboard:', error);
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
