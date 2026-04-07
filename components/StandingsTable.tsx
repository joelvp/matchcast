import type { TeamStanding } from '../domain/types'

type Props = {
  standings: TeamStanding[]
  projected?: TeamStanding[]
  subtitle?: string
}

export function StandingsTable({ standings, projected, subtitle }: Props) {
  const rows = projected ?? standings
  const sorted = [...rows].sort((a, b) => {
    const pd = b.points - a.points
    if (pd !== 0) return pd
    const gda = a.goalsFor - a.goalsAgainst
    const gdb = b.goalsFor - b.goalsAgainst
    if (gdb !== gda) return gdb - gda
    return b.goalsFor - a.goalsFor
  })

  return (
    <div className="bg-surface-container-low overflow-hidden rounded-xl">
      <div className="border-outline-variant/10 bg-surface-container-high/50 flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-headline text-primary text-lg font-bold tracking-widest uppercase">
          Clasificación
        </h2>
        {subtitle && (
          <span className="text-on-surface-variant text-[10px] font-medium tracking-tight uppercase">
            {subtitle}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container/30 text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Eq</th>
              <th className="px-4 py-3 text-center">Pts</th>
              <th className="px-4 py-3 text-center">PJ</th>
              <th className="px-4 py-3 text-center">G</th>
              <th className="px-4 py-3 text-center">E</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">DG</th>
              {projected && <th className="px-4 py-3 text-center">±</th>}
            </tr>
          </thead>
          <tbody className="text-sm font-medium">
            {sorted.map((team, i) => {
              const currentPos = projected
                ? standings.findIndex((s) => s.teamId === team.teamId)
                : i
              const diff = projected ? currentPos - i : null
              const gd = team.goalsFor - team.goalsAgainst
              const isTop = i === 0

              return (
                <tr
                  key={team.teamId}
                  className={`animate-fade-in-up border-outline-variant/5 border-b ${isTop ? 'bg-primary/5' : i % 2 === 0 ? 'bg-surface-container/30' : ''}`}
                  style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
                >
                  <td className="px-4 py-4">
                    <span
                      className={`font-bold tabular-nums ${isTop ? 'text-primary' : 'text-on-surface'}`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="font-headline text-on-surface px-4 py-4 font-bold">
                    {team.shortName}
                  </td>
                  <td
                    className={`px-4 py-4 text-center font-bold tabular-nums ${isTop ? 'text-primary-fixed' : 'text-on-surface'}`}
                  >
                    {team.points}
                  </td>
                  <td className="text-on-surface-variant px-4 py-4 text-center tabular-nums">
                    {team.played}
                  </td>
                  <td className="px-4 py-4 text-center tabular-nums">{team.won}</td>
                  <td className="px-4 py-4 text-center tabular-nums">{team.drawn}</td>
                  <td className="px-4 py-4 text-center tabular-nums">{team.lost}</td>
                  <td
                    className={`px-4 py-4 text-center tabular-nums ${gd > 0 ? 'text-primary' : gd < 0 ? 'text-secondary' : 'text-on-surface-variant'}`}
                  >
                    {gd > 0 ? `+${gd}` : gd}
                  </td>
                  {projected && (
                    <td className="px-4 py-4 text-center text-xs">
                      {diff === null || diff === 0 ? (
                        <span className="text-on-surface-variant">—</span>
                      ) : diff > 0 ? (
                        <span className="text-primary font-bold">↑{diff}</span>
                      ) : (
                        <span className="text-secondary font-bold">↓{Math.abs(diff)}</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
