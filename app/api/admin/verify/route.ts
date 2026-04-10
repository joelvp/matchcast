import { NextRequest, NextResponse } from 'next/server'
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

  const { pin } = body as Record<string, unknown>
  if (pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
