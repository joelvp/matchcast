import type { TeamStanding } from '../domain/types'

type Props = {
  standings: TeamStanding[]
  projected?: TeamStanding[]
}

export function StandingsTable({ standings, projected }: Props) {
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-semibold tracking-wider text-zinc-500 uppercase dark:border-zinc-700 dark:text-zinc-400">
            <th className="py-3 pr-2 text-left">#</th>
            <th className="py-3 pr-4 text-left">Equipo</th>
            <th className="px-2 py-3 text-center">PJ</th>
            <th className="px-2 py-3 text-center">G</th>
            <th className="px-2 py-3 text-center">E</th>
            <th className="px-2 py-3 text-center">P</th>
            <th className="px-2 py-3 text-center">GF</th>
            <th className="px-2 py-3 text-center">GC</th>
            <th className="px-2 py-3 text-center">DG</th>
            <th className="py-3 pl-2 text-center font-bold text-zinc-800 dark:text-zinc-100">
              Pts
            </th>
            {projected && <th className="py-3 pl-3 text-center">±</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((team, i) => {
            const currentPos = projected ? standings.findIndex((s) => s.teamId === team.teamId) : i
            const projectedPos = i
            const diff = projected ? currentPos - projectedPos : null
            const gd = team.goalsFor - team.goalsAgainst

            return (
              <tr
                key={team.teamId}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="py-3 pr-2 text-zinc-400 tabular-nums">{i + 1}</td>
                <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {team.shortName}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.played}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.won}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.drawn}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.lost}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.goalsFor}
                </td>
                <td className="px-2 py-3 text-center text-zinc-600 tabular-nums dark:text-zinc-400">
                  {team.goalsAgainst}
                </td>
                <td
                  className={`px-2 py-3 text-center tabular-nums ${gd > 0 ? 'text-emerald-600 dark:text-emerald-400' : gd < 0 ? 'text-red-500' : 'text-zinc-400'}`}
                >
                  {gd > 0 ? `+${gd}` : gd}
                </td>
                <td className="py-3 pl-2 text-center font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
                  {team.points}
                </td>
                {projected && (
                  <td className="py-3 pl-3 text-center text-xs">
                    {diff === null || diff === 0 ? (
                      <span className="text-zinc-300 dark:text-zinc-600">—</span>
                    ) : diff > 0 ? (
                      <span className="font-semibold text-emerald-500">↑{diff}</span>
                    ) : (
                      <span className="font-semibold text-red-400">↓{Math.abs(diff)}</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
