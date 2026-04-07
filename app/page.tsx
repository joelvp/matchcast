import { MatchCard } from '../components/MatchCard'
import { StandingsTable } from '../components/StandingsTable'
import { getMatches } from '../infrastructure/supabase/matchRepository'
import { getStandings } from '../infrastructure/supabase/standingsRepository'

export default async function HomePage() {
  const [standings, matches] = await Promise.all([getStandings(), getMatches()])

  const nextRound = matches.find((m) => !m.isFinished)?.round
  const nextRoundMatches = nextRound ? matches.filter((m) => m.round === nextRound) : []

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Clasificación actual
        </h1>
        <StandingsTable standings={standings} />
      </section>

      {nextRoundMatches.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Próxima jornada — J{nextRound}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {nextRoundMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
