import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/infrastructure/supabase/adminAuth'

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession(request.headers.get('Authorization')))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const force = body.force === true

  const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-results`)
  if (force) url.searchParams.set('force', 'true')

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
