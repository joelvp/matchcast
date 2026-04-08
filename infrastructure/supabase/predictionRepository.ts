import type { Prediction } from '../../domain/types'
import { supabaseServer } from './server'

export async function getPredictionsByUser(userId: string): Promise<Prediction[]> {
  const { data, error } = await supabaseServer
    .from('predictions')
    .select('user_id, match_id, home_goals, away_goals')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    userId: row.user_id,
    matchId: row.match_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
  }))
}

export async function getAllPredictions(): Promise<Prediction[]> {
  const { data, error } = await supabaseServer
    .from('predictions')
    .select('user_id, match_id, home_goals, away_goals')

  if (error) throw new Error(error.message)

  return data.map((row) => ({
    userId: row.user_id,
    matchId: row.match_id,
    homeGoals: row.home_goals,
    awayGoals: row.away_goals,
  }))
}

export async function deletePrediction(userId: string, matchId: number): Promise<void> {
  const { error } = await supabaseServer
    .from('predictions')
    .delete()
    .eq('user_id', userId)
    .eq('match_id', matchId)

  if (error) throw new Error(error.message)
}

export async function upsertPrediction(prediction: Prediction): Promise<void> {
  const { error } = await supabaseServer.from('predictions').upsert(
    {
      user_id: prediction.userId,
      match_id: prediction.matchId,
      home_goals: prediction.homeGoals,
      away_goals: prediction.awayGoals,
    },
    { onConflict: 'user_id,match_id' },
  )

  if (error) throw new Error(error.message)
}
