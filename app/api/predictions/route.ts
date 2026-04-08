import { NextRequest, NextResponse } from 'next/server'
import {
  deletePrediction,
  getPredictionsByUser,
  upsertPrediction,
} from '../../../infrastructure/supabase/predictionRepository'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const predictions = await getPredictionsByUser(userId)
    return NextResponse.json(predictions)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, matchId, homeGoals, awayGoals } = body as Record<string, unknown>

  if (
    typeof userId !== 'string' ||
    typeof matchId !== 'number' ||
    typeof homeGoals !== 'number' ||
    typeof awayGoals !== 'number'
  ) {
    return NextResponse.json(
      { error: 'userId (string), matchId, homeGoals, awayGoals (numbers) are required' },
      { status: 400 },
    )
  }

  try {
    await upsertPrediction({ userId, matchId, homeGoals, awayGoals })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, matchId } = body as Record<string, unknown>

  if (typeof userId !== 'string' || typeof matchId !== 'number') {
    return NextResponse.json(
      { error: 'userId (string) and matchId (number) are required' },
      { status: 400 },
    )
  }

  try {
    await deletePrediction(userId, matchId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
