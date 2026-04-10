import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/infrastructure/supabase/server'
import { verifyAdminSession } from '@/infrastructure/supabase/adminAuth'
import { upsertPrediction } from '@/infrastructure/supabase/predictionRepository'

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = request.nextUrl.searchParams.get('userId')
  const round = Number(request.nextUrl.searchParams.get('round'))
  if (!userId || !round) {
    return NextResponse.json({ error: 'userId and round are required' }, { status: 400 })
  }

  const { data: matches, error: matchError } = await supabaseServer
    .from('matches')
    .select('id')
    .eq('round', round)

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  const matchIds = matches.map((m) => m.id)

  const { data, error } = await supabaseServer
    .from('predictions')
    .select('match_id, home_goals, away_goals')
    .eq('user_id', userId)
    .in('match_id', matchIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    data.map((row) => ({
      matchId: row.match_id,
      homeGoals: row.home_goals,
      awayGoals: row.away_goals,
    })),
  )
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      { error: 'userId, matchId, homeGoals, awayGoals are required' },
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
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, round } = body as Record<string, unknown>
  if (typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }
  if (typeof round !== 'number') {
    return NextResponse.json({ error: 'round is required' }, { status: 400 })
  }

  // Get match IDs for this round
  const { data: matches, error: matchError } = await supabaseServer
    .from('matches')
    .select('id')
    .eq('round', round)

  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  const matchIds = matches.map((m) => m.id)

  const { error } = await supabaseServer
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .in('match_id', matchIds)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
