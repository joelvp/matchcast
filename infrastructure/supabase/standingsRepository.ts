import type { TeamStanding } from '../../domain/types'
import { supabaseServer } from './server'

export async function getStandings(): Promise<TeamStanding[]> {
  const { data, error } = await supabaseServer
    .from('standings')
    .select(
      'team_id, points, played, won, drawn, lost, goals_for, goals_against, teams(name, short_name)',
    )

  if (error) throw new Error(error.message)

  return data.map((row) => {
    const team = (Array.isArray(row.teams) ? row.teams[0] : row.teams) as {
      name: string
      short_name: string
    }
    return {
      teamId: row.team_id,
      name: team.name,
      shortName: team.short_name,
      points: row.points,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goals_for,
      goalsAgainst: row.goals_against,
    }
  })
}
