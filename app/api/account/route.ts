import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, name, metadata } = body as { wallet?: string; name?: string | null; metadata?: any }

    if (!wallet) {
      return NextResponse.json({ error: 'wallet is required' }, { status: 400 })
    }

    const lower = wallet.toLowerCase()

    const user = await prisma.user.upsert({
      where: { address: lower },
      create: {
        address: lower,
        name: name ?? null,
        metadata: metadata ?? undefined,
      },
      update: {
        name: name ?? undefined,
        metadata: metadata ?? undefined,
      },
    })

    return NextResponse.json({
      id: user.id,
      wallet: user.address,
      name: user.name ?? null,
      metadata: user.metadata ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  } catch (err) {
    console.error('account upsert failed', err)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) {
    return NextResponse.json({ error: 'wallet is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { address: wallet.toLowerCase() } })
  if (!user) return NextResponse.json({ exists: false }, { status: 200 })

  return NextResponse.json({
    exists: true,
    id: user.id,
    wallet: user.address,
    name: user.name ?? null,
    metadata: user.metadata ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  })
}


