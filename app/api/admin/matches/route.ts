import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseServer } from '@/infrastructure/supabase/server'
import { verifyAdminSession } from '@/infrastructure/supabase/adminAuth'

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { matchId, matchDate } = body as Record<string, unknown>
  if (typeof matchId !== 'number' || typeof matchDate !== 'string') {
    return NextResponse.json({ error: 'matchId and matchDate are required' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('matches')
    .update({ match_date: matchDate })
    .eq('id', matchId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  revalidatePath('/')
  revalidatePath('/results')

  return NextResponse.json({ ok: true })
}
