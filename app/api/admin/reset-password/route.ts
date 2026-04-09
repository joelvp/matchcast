import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '../../../../infrastructure/supabase/server'

export async function POST(request: NextRequest) {
  // Verify session from Authorization header
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser(token)

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.email !== 'admin@matchcast.local') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { username, newPassword } = body as Record<string, unknown>

  if (typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }

  if (typeof newPassword !== 'string' || !newPassword) {
    return NextResponse.json({ error: 'newPassword is required' }, { status: 400 })
  }

  // Find user UUID from our users table
  const { data: targetUser, error: userError } = await supabaseServer
    .from('users')
    .select('id')
    .ilike('name', username.trim())
    .single()

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Update password via Supabase Auth admin API
  const { error: updateError } = await supabaseServer.auth.admin.updateUserById(targetUser.id, {
    password: newPassword,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, username: username.trim() })
}
