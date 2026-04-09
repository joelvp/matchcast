import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateUser } from '@/infrastructure/supabase/userRepository'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, name } = body as Record<string, unknown>
  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const user = await getOrCreateUser(id.trim(), name.trim())
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
