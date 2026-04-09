import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '../../../../infrastructure/supabase/server'
import { verifyAdminSession } from '../../../../infrastructure/supabase/adminAuth'

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseServer.from('users').select('id, name').order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
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

  const { userId } = body as Record<string, unknown>
  if (typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  // Delete predictions first (FK constraint)
  const { error: predError } = await supabaseServer
    .from('predictions')
    .delete()
    .eq('user_id', userId)

  if (predError) return NextResponse.json({ error: predError.message }, { status: 500 })

  // Delete from users table
  const { error: userError } = await supabaseServer.from('users').delete().eq('id', userId)

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  // Delete from Supabase Auth
  const { error: authError } = await supabaseServer.auth.admin.deleteUser(userId)

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
