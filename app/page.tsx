import { RoundViewer } from '@/components/RoundViewer'
import { StandingsTable } from '@/components/StandingsTable'
import { getMatches } from '@/infrastructure/supabase/matchRepository'
import { getStandings } from '@/infrastructure/supabase/standingsRepository'

export default async function HomePage() {
  const [standings, matches] = await Promise.all([getStandings(), getMatches()])

  const teams = Object.fromEntries(
    standings.map((s) => [s.teamId, { shortName: s.shortName, shieldUrl: s.shieldUrl }]),
  )

  const hasLive = matches.some((m) => m.isLive)

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-headline mb-1 text-4xl leading-none font-extrabold tracking-tighter uppercase">
          DHB Masculina
          <br />
          <span className="text-primary">Hockey Hierba</span>
        </h1>
      </section>

      <section>
        <StandingsTable standings={standings} badge={hasLive ? 'live' : undefined} />
      </section>

      <section>
        <RoundViewer matches={matches} teams={teams} />
      </section>
    </div>
  )
}
