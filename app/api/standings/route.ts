export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getStandings } from '@/infrastructure/supabase/standingsRepository'

export async function GET() {
  try {
    const standings = await getStandings()
    return NextResponse.json(standings)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
