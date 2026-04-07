import type { Match, Prediction } from '../domain/types'

type Props = {
  match: Match
  prediction?: Prediction
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function MatchCard({ match, prediction }: Props) {
  const isFinished = match.isFinished
  const hasPrediction = prediction !== undefined

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <div className="mb-2 text-xs font-medium tracking-wide text-zinc-400 uppercase">
        J{match.round} · {formatDate(match.matchDate)}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex-1 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {match.homeTeamId}
        </span>

        <div className="flex items-center gap-2 text-base font-bold tabular-nums">
          {isFinished ? (
            <>
              <span className="text-zinc-900 dark:text-zinc-100">{match.homeGoals}</span>
              <span className="text-zinc-300 dark:text-zinc-600">–</span>
              <span className="text-zinc-900 dark:text-zinc-100">{match.awayGoals}</span>
            </>
          ) : hasPrediction ? (
            <>
              <span className="text-indigo-600 dark:text-indigo-400">{prediction.homeGoals}</span>
              <span className="text-zinc-300 dark:text-zinc-600">–</span>
              <span className="text-indigo-600 dark:text-indigo-400">{prediction.awayGoals}</span>
            </>
          ) : (
            <span className="text-sm font-normal text-zinc-400">vs</span>
          )}
        </div>

        <span className="flex-1 text-left text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {match.awayTeamId}
        </span>
      </div>

      {isFinished && hasPrediction && (
        <div className="mt-2 text-center text-xs text-zinc-400">
          Tu predicción: {prediction.homeGoals}–{prediction.awayGoals}
        </div>
      )}
    </div>
  )
}
