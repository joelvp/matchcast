import type { Match } from '@/domain/types'
import { supabaseServer } from './server'

export async function getMatches(): Promise<Match[]> {
  const { data, error } = await supabaseServer
    .from('matches')
    .select(
      'id, round, match_date, home_team_id, away_team_id, home_goals, away_goals, is_finished',
    )
    .order('round')
    .order('id')

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    id: row.id,
    round: row.round,
    matchDate: row.match_date,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
    isFinished: row.is_finished,
  }))
}
