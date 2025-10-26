import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snarkelId: string }> }
) {
  const { snarkelId } = await params;
  try {

    // Fetch questions with options for the quiz
    const questions = await prisma.question.findMany({
      where: {
        snarkelId: snarkelId
      },
      include: {
        options: {
          select: {
            id: true,
            text: true,
            isCorrect: true,
            order: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    if (!questions || questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No questions found for this quiz'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      questions: questions
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
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
