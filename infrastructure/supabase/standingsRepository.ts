import type { TeamStanding } from '@/domain/types'
import { supabaseServer } from './server'

export async function getStandings(): Promise<TeamStanding[]> {
  const { data, error } = await supabaseServer
    .from('current_standings')
    .select(
      'team_id, name, short_name, shield_url, points, played, won, drawn, lost, goals_for, goals_against',
    )

  if (error) throw new Error(error.message)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  return data.map((row) => ({
    teamId: row.team_id,
    name: row.name,
    shortName: row.short_name,
    shieldUrl: row.shield_url
      ? `${supabaseUrl}/storage/v1/object/public/${row.shield_url}`
      : undefined,
    points: row.points,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  }))
}
