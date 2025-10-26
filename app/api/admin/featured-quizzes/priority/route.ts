import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, priority } = body;

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    if (!priority || priority < 1 || priority > 10) {
      return NextResponse.json(
        { error: 'Priority must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Update the featured content priority
    const updatedQuiz = await prisma.snarkel.update({
      where: { id: quizId },
      data: {
        featuredContent: {
          upsert: {
            create: {
              priority: priority,
              isActive: true
            },
            update: {
              priority: priority
            }
          }
        }
      },
      include: {
        creator: {
          select: {
            address: true,
            name: true
          }
        },
        featuredContent: true,
        _count: {
          select: {
            questions: true,
            submissions: true
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      quiz: updatedQuiz 
    });
  } catch (error) {
    console.error('Error updating priority:', error);
    return NextResponse.json(
      { error: 'Failed to update priority' },
      { status: 500 }
    );
  }
}
