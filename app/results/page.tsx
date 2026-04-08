import { Leaderboard } from '../../components/Leaderboard'
import { calculateLeaderboard } from '../../domain/leaderboard'
import { getMatches } from '../../infrastructure/supabase/matchRepository'
import { getAllPredictions } from '../../infrastructure/supabase/predictionRepository'
import { getUsersByIds } from '../../infrastructure/supabase/userRepository'

export default async function ResultsPage() {
  const [matches, allPredictions] = await Promise.all([getMatches(), getAllPredictions()])

  const userIds = [...new Set(allPredictions.map((p) => p.userId))]
  const users = await getUsersByIds(userIds)

  const entries = calculateLeaderboard(allPredictions, matches, users)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-headline text-secondary text-sm font-bold tracking-widest uppercase">
          Global Ranking
        </span>
        <h1 className="font-headline text-primary text-4xl leading-none font-bold">MARCADOR</h1>
      </div>

      <Leaderboard entries={entries} />
    </div>
  )
}
