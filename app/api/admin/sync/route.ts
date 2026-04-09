import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/infrastructure/supabase/adminAuth'

export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-results`

  const res = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    return NextResponse.json({ error }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
