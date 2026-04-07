import { NextResponse } from 'next/server'
import { calculateLeaderboard } from '../../../domain/leaderboard'
import { getMatches } from '../../../infrastructure/supabase/matchRepository'
import { getAllPredictions } from '../../../infrastructure/supabase/predictionRepository'
import { getUsersByIds } from '../../../infrastructure/supabase/userRepository'

export async function GET() {
  try {
    const [matches, allPredictions] = await Promise.all([getMatches(), getAllPredictions()])

    const userIds = [...new Set(allPredictions.map((p) => p.userId))]
    const users = await getUsersByIds(userIds)

    const entries = calculateLeaderboard(allPredictions, matches, users)
    return NextResponse.json(entries)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
