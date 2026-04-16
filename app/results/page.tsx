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

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-4xl leading-none font-extrabold tracking-tighter uppercase">
        Ranking
      </h1>

      <Leaderboard entries={entries} />
    </div>
  )
}
