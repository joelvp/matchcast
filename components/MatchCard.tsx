import type { Match, Prediction } from '../domain/types'

type Props = {
  match: Match
  prediction?: Prediction
  teams?: Record<number, string>
}

export function MatchCard({ match, prediction, teams }: Props) {
  const isFinished = match.isFinished
  const hasPrediction = prediction !== undefined
  const homeName = teams?.[match.homeTeamId] ?? `#${match.homeTeamId}`
  const awayName = teams?.[match.awayTeamId] ?? `#${match.awayTeamId}`
  const homeInitial = homeName.charAt(0).toUpperCase()
  const awayInitial = awayName.charAt(0).toUpperCase()

  return (
    <div className="bg-surface-container relative overflow-hidden rounded-xl">
      <div
        className={`absolute top-0 left-0 h-full w-1 ${isFinished ? 'bg-primary-container' : 'bg-outline-variant/40'}`}
      />

      <div className="p-5 pl-6">
        <div className="flex items-center justify-between">
          {/* Home team */}
          <div className="flex w-5/12 flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <span className="font-headline text-on-surface-variant text-lg font-black">
                {homeInitial}
              </span>
            </div>
            <span className="text-center text-xs leading-tight font-bold uppercase">
              {homeName}
            </span>
          </div>

          {/* Score / vs */}
          <div className="flex w-2/12 flex-col items-center gap-1">
            {isFinished ? (
              <>
                <div className="font-headline flex items-center gap-2 text-3xl font-black tracking-tighter">
                  <span>{match.homeGoals}</span>
                  <span className="text-outline-variant text-xl">-</span>
                  <span>{match.awayGoals}</span>
                </div>
                <span className="bg-primary/10 text-primary-fixed rounded-full px-3 py-0.5 text-[10px] font-black tracking-widest uppercase">
                  Finalizado
                </span>
              </>
            ) : hasPrediction ? (
              <>
                <div className="font-headline text-primary flex items-center gap-2 text-3xl font-black tracking-tighter">
                  <span>{prediction.homeGoals}</span>
                  <span className="text-outline-variant text-xl">-</span>
                  <span>{prediction.awayGoals}</span>
                </div>
                <span className="bg-surface-container-high text-on-surface-variant rounded-full px-3 py-0.5 text-[10px] font-black tracking-widest uppercase">
                  Tu pred.
                </span>
              </>
            ) : (
              <span className="font-headline text-on-surface-variant text-xl font-bold">vs</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex w-5/12 flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <span className="font-headline text-on-surface-variant text-lg font-black">
                {awayInitial}
              </span>
            </div>
            <span className="text-center text-xs leading-tight font-bold uppercase">
              {awayName}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
