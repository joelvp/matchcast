export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getMatches } from '@/infrastructure/supabase/matchRepository'

export async function GET() {
  try {
    const matches = await getMatches()
    return NextResponse.json(matches)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
