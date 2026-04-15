import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/infrastructure/supabase/server'
import { verifyAdminSession } from '@/infrastructure/supabase/adminAuth'

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { matchId, homeGoals, awayGoals, isFinished } = body as Record<string, unknown>

  if (typeof matchId !== 'number') {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  }
  if (typeof homeGoals !== 'number' || typeof awayGoals !== 'number') {
    return NextResponse.json({ error: 'homeGoals and awayGoals are required' }, { status: 400 })
  }

  const finished = isFinished ?? true
  const { error } = await supabaseServer
    .from('matches')
    .update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      is_finished: finished,
      is_live: !finished,
    })
    .eq('id', matchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseServer.rpc('refresh_standings')

  revalidatePath('/')
  revalidatePath('/results')

  return NextResponse.json({ ok: true })
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

  const { matchId } = body as Record<string, unknown>
  if (typeof matchId !== 'number') {
    return NextResponse.json({ error: 'matchId is required' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('matches')
    .update({ home_goals: null, away_goals: null, is_finished: false, is_live: false })
    .eq('id', matchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseServer.rpc('refresh_standings')

  revalidatePath('/')
  revalidatePath('/results')

  return NextResponse.json({ ok: true })
}
