import { NextResponse } from 'next/server'
import { calculateLeaderboard } from '@/domain/leaderboard'
import { getMatches } from '@/infrastructure/supabase/matchRepository'
import { getAllPredictions } from '@/infrastructure/supabase/predictionRepository'
import { getAllUsers } from '@/infrastructure/supabase/userRepository'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roundParam = searchParams.get('round')
    const round = roundParam ? Number(roundParam) : null

    const [allMatches, allPredictions, users] = await Promise.all([
      getMatches(),
      getAllPredictions(),
      getAllUsers(),
    ])

    const matches = round ? allMatches.filter((m) => m.round === round) : allMatches

    const relevantUsers = round
      ? (() => {
          const matchIds = new Set(matches.map((m) => m.id))
          const participantIds = new Set(
            allPredictions.filter((p) => matchIds.has(p.matchId)).map((p) => p.userId),
          )
          return users.filter((u) => participantIds.has(u.id))
        })()
      : users

    const entries = calculateLeaderboard(allPredictions, matches, relevantUsers)
    return NextResponse.json(entries)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
