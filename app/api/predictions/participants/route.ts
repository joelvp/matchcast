import { NextResponse } from 'next/server'
import { getMatches } from '../../../../infrastructure/supabase/matchRepository'
import { getAllPredictions } from '../../../../infrastructure/supabase/predictionRepository'
import { getAllUsers } from '../../../../infrastructure/supabase/userRepository'

export type RoundParticipant = {
  userId: string
  userName: string
  count: number
  total: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const round = Number(searchParams.get('round'))

    const [matches, allPredictions, users] = await Promise.all([
      getMatches(),
      getAllPredictions(),
      getAllUsers(),
    ])

    const roundMatchIds = new Set(matches.filter((m) => m.round === round).map((m) => m.id))
    const total = roundMatchIds.size

    const userById = new Map(users.map((u) => [u.id, u]))
    const countByUser = new Map<string, number>()

    for (const p of allPredictions) {
      if (roundMatchIds.has(p.matchId)) {
        countByUser.set(p.userId, (countByUser.get(p.userId) ?? 0) + 1)
      }
    }

    const participants = Array.from(countByUser.entries())
      .map(([userId, count]) => ({
        userId,
        userName: userById.get(userId)?.name ?? 'Unknown',
        count,
        total,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(participants)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
