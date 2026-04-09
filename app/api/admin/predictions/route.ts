import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '../../../../infrastructure/supabase/server'
import { verifyAdminSession } from '../../../../infrastructure/supabase/adminAuth'

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
