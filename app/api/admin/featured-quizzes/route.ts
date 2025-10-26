import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client/edge';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get all quizzes with featured content info
    const quizzes = await prisma.snarkel.findMany({
      where: {
        isActive: true
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
      },
      orderBy: [
        { featuredContent: { priority: 'desc' } },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Error fetching featured quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured quizzes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, isFeatured, priority = 1 } = body;

    if (!quizId) {
      return NextResponse.json(
        { error: 'Quiz ID is required' },
        { status: 400 }
      );
    }

    // Update the quiz's featured status
    const updateData: any = {
      isFeatured: isFeatured
    };

    // If making featured, create or update featured content
    if (isFeatured) {
      updateData.featuredContent = {
        upsert: {
          create: {
            priority: priority,
            isActive: true
          },
          update: {
            priority: priority,
            isActive: true
          }
        }
      };
    } else {
      // If removing featured, delete featured content
      updateData.featuredContent = {
        delete: true
      };
    }

    const updatedQuiz = await prisma.snarkel.update({
      where: { id: quizId },
      data: updateData,
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
    console.error('Error updating featured status:', error);
    return NextResponse.json(
      { error: 'Failed to update featured status' },
      { status: 500 }
    );
  }
}
