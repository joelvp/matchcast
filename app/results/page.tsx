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
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Marcador</h1>
      <Leaderboard entries={entries} />
    </div>
  )
}
