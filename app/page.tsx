import { MatchCard } from '../components/MatchCard'
import { StandingsTable } from '../components/StandingsTable'
import { getMatches } from '../infrastructure/supabase/matchRepository'
import { getStandings } from '../infrastructure/supabase/standingsRepository'

export default async function HomePage() {
  const [standings, matches] = await Promise.all([getStandings(), getMatches()])

  const teams = Object.fromEntries(standings.map((s) => [s.teamId, s.shortName]))
  const lastFinishedRound = matches.filter((m) => m.isFinished).at(-1)?.round
  const nextRound = matches.find((m) => !m.isFinished)?.round
  const displayRound = lastFinishedRound ?? nextRound
  const displayMatches = displayRound ? matches.filter((m) => m.round === displayRound) : []
  const sectionLabel = lastFinishedRound
    ? `Resultados Jornada ${lastFinishedRound}`
    : nextRound
      ? `Próxima — J${nextRound}`
      : null
  const subtitle = lastFinishedRound ? `J${lastFinishedRound} finalizada` : undefined

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-headline mb-1 text-4xl leading-none font-extrabold tracking-tighter uppercase">
          DH Masculina
          <br />
          <span className="text-primary">Hockey Hierba</span>
        </h1>
      </section>

      <section>
        <StandingsTable standings={standings} subtitle={subtitle} />
      </section>

      {displayMatches.length > 0 && sectionLabel && (
        <section>
          <h2 className="font-headline mb-4 text-2xl font-bold tracking-tight uppercase">
            {sectionLabel}
          </h2>
          <div className="space-y-3">
            {displayMatches.map((match) => (
              <MatchCard key={match.id} match={match} teams={teams} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
