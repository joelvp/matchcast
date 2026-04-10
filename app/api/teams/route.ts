import { NextResponse } from 'next/server'
import { supabaseServer } from '@/infrastructure/supabase/server'

export async function GET() {
  const { data, error } = await supabaseServer.from('teams').select('id, name, short_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    data.map((row) => ({ id: row.id, name: row.name, shortName: row.short_name })),
  )
}
