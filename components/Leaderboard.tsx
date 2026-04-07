import type { LeaderboardEntry } from '../domain/types'

type Props = {
  entries: LeaderboardEntry[]
}

const SCORE_LABELS: Record<number, { label: string; className: string }> = {
  5: { label: '✅', className: 'text-emerald-600 dark:text-emerald-400' },
  2: { label: '🟡', className: 'text-amber-500' },
  0: { label: '❌', className: 'text-red-400' },
}

export function Leaderboard({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-400">
        No hay resultados todavía — vuelve cuando acabe la primera jornada.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

        return (
          <div
            key={entry.userId}
            className={`rounded-lg border px-4 py-3 ${
              i === 0
                ? 'border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10'
                : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-base">
                {medal ?? <span className="text-sm font-semibold text-zinc-400">{i + 1}</span>}
              </span>

              <span className="flex-1 font-semibold text-zinc-900 dark:text-zinc-100">
                {entry.userName}
              </span>

              <div className="flex gap-1 text-sm">
                {entry.breakdown.map((b) => {
                  const info = SCORE_LABELS[b.points] ?? SCORE_LABELS[0]
                  return (
                    <span key={b.matchId} title={`Partido ${b.matchId}: ${b.points} pts`}>
                      {info.label}
                    </span>
                  )
                })}
              </div>

              <span className="ml-2 text-base font-bold text-zinc-900 tabular-nums dark:text-zinc-100">
                {entry.totalPoints}
                <span className="ml-0.5 text-xs font-normal text-zinc-400">pts</span>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
