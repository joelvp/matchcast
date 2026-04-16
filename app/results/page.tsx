import { Leaderboard } from '@/components/Leaderboard'
import { calculateLeaderboard } from '@/domain/leaderboard'
import { getMatches } from '@/infrastructure/supabase/matchRepository'
import { getAllPredictions } from '@/infrastructure/supabase/predictionRepository'
import { getAllUsers } from '@/infrastructure/supabase/userRepository'

export default async function ResultsPage() {
  const [matches, allPredictions, users] = await Promise.all([
    getMatches(),
    getAllPredictions(),
    getAllUsers(),
  ])

  const entries = calculateLeaderboard(allPredictions, matches, users)

  // Find the latest fully-finished round that has at least one prediction
  const roundsWithPredictions = new Set(
    allPredictions.map((p) => matches.find((m) => m.id === p.matchId)?.round).filter(Boolean),
  )
  const finishedRounds = [
    ...new Set(
      matches.filter((m) => m.isFinished && roundsWithPredictions.has(m.round)).map((m) => m.round),
    ),
  ]
    .filter((r) => matches.filter((m) => m.round === r).every((m) => m.isFinished))
    .sort((a, b) => a - b)

  const latestRound = finishedRounds[finishedRounds.length - 1]
  const previousMatches =
    finishedRounds.length > 1 ? matches.filter((m) => m.round !== latestRound) : []
  const previousEntries =
    previousMatches.length > 0 ? calculateLeaderboard(allPredictions, previousMatches, users) : []
  const prevPositions = new Map(previousEntries.map((e, idx) => [e.userId, idx + 1]))

  const prevBreakdownByUser = new Map(previousEntries.map((e) => [e.userId, e.breakdown.length]))
  const positionDeltas: Record<string, number> = {}
  entries.forEach((entry, idx) => {
    const prevPos = prevPositions.get(entry.userId)
    const hadPreviousPredictions = (prevBreakdownByUser.get(entry.userId) ?? 0) > 0
    if (prevPos !== undefined && hadPreviousPredictions) {
      positionDeltas[entry.userId] = prevPos - (idx + 1)
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-4xl leading-none font-extrabold tracking-tighter uppercase">
        Ranking
      </h1>

      <Leaderboard entries={entries} positionDeltas={positionDeltas} />
    </div>
  )
}
