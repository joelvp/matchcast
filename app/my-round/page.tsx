'use client'

import { useEffect, useState } from 'react'
import type { Match, Prediction, TeamStanding } from '../../domain/types'
import { scorePrediction } from '../../domain/leaderboard'

type ScoredMatch = {
  match: Match
  prediction: Prediction | undefined
  points: number | null
}

export default function MyRoundPage() {
  const [userId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('matchcast_user_id') : null,
  )
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [teams, setTeams] = useState<Record<number, string>>({})
  // Only load if there's a userId — avoids setState-in-effect for the no-auth case
  const [loading, setLoading] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('matchcast_user_id') !== null : false,
  )
  const [activeRound, setActiveRound] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return

    async function load() {
      const [matchesRes, predictionsRes, standingsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${userId}`),
        fetch('/api/standings'),
      ])
      const [matchesData, predictionsData, standingsData]: [Match[], Prediction[], TeamStanding[]] =
        await Promise.all([matchesRes.json(), predictionsRes.json(), standingsRes.json()])

      setMatches(matchesData)
      setPredictions(predictionsData)
      setTeams(Object.fromEntries(standingsData.map((s) => [s.teamId, s.shortName])))

      // Default to last round with both real results + user predictions
      const scoredRounds = [
        ...new Set(
          matchesData
            .filter((m) => m.isFinished && predictionsData.find((p) => p.matchId === m.id))
            .map((m) => m.round),
        ),
      ].sort()
      const defaultRound = scoredRounds.at(-1) ?? matchesData[0]?.round ?? null
      setActiveRound(defaultRound)
      setLoading(false)
    }

    load()
  }, [userId])

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <span
          className="material-symbols-outlined text-on-surface-variant text-4xl"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          sports
        </span>
        <p className="text-on-surface-variant text-sm">
          Regístrate en <span className="text-primary font-bold">Predecir</span> para ver tu
          jornada.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="font-headline text-primary-container text-4xl font-black">•••</div>
      </div>
    )
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const activeIdx = activeRound ? rounds.indexOf(activeRound) : -1
  const prevRound = activeIdx > 0 ? rounds[activeIdx - 1] : null
  const nextRound = activeIdx < rounds.length - 1 ? rounds[activeIdx + 1] : null

  const roundMatches = activeRound ? matches.filter((m) => m.round === activeRound) : []
  const scored: ScoredMatch[] = roundMatches.map((match) => {
    const prediction = predictions.find((p) => p.matchId === match.id)
    if (!prediction || !match.isFinished || match.homeGoals === null || match.awayGoals === null) {
      return { match, prediction, points: null }
    }
    const points = scorePrediction(
      { home: prediction.homeGoals, away: prediction.awayGoals },
      { home: match.homeGoals, away: match.awayGoals },
    )
    return { match, prediction, points }
  })

  const totalPoints = scored.reduce((sum, s) => sum + (s.points ?? 0), 0)
  const roundIsFinished = roundMatches.every((m) => m.isFinished)

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="font-headline text-4xl leading-none font-extrabold tracking-tighter uppercase">
          Mi <span className="text-primary">Jornada</span>
        </h1>
      </div>

      {/* Round selector */}
      <div className="flex items-end justify-center gap-4">
        {/* Previous */}
        <button
          onClick={() => prevRound && setActiveRound(prevRound)}
          disabled={!prevRound}
          className="flex flex-col items-center gap-2 disabled:opacity-30"
        >
          <span className="text-outline text-[10px] font-bold tracking-widest uppercase">
            Anterior
          </span>
          <div className="font-headline border-outline-variant/10 bg-surface-container-high text-on-surface-variant flex h-14 w-14 items-center justify-center rounded-xl border text-xl font-bold">
            {prevRound ? `J${prevRound}` : '—'}
          </div>
        </button>

        {/* Current (active) */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-primary text-[10px] font-bold tracking-widest uppercase">
            Actual
          </span>
          <div
            className="font-headline bg-primary-container text-on-primary-fixed flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-black"
            style={{ boxShadow: '0 0 30px rgba(209, 252, 0, 0.3)' }}
          >
            {activeRound ? `J${activeRound}` : '—'}
          </div>
        </div>

        {/* Next */}
        <button
          onClick={() => nextRound && setActiveRound(nextRound)}
          disabled={!nextRound}
          className="flex flex-col items-center gap-2 disabled:opacity-30"
        >
          <span className="text-outline text-[10px] font-bold tracking-widest uppercase">
            Siguiente
          </span>
          <div className="font-headline border-outline-variant/15 bg-surface-container-low text-outline flex h-14 w-14 items-center justify-center rounded-xl border text-xl font-bold">
            {nextRound ? `J${nextRound}` : '—'}
          </div>
        </button>
      </div>

      {/* Total points badge */}
      {roundIsFinished && scored.some((s) => s.points !== null) && (
        <div className="bg-surface-container-low flex items-center justify-between rounded-xl px-5 py-4">
          <span className="font-headline text-on-surface-variant text-sm font-bold tracking-widest uppercase">
            Total jornada
          </span>
          <span className="font-headline text-primary-container text-2xl font-black">
            {totalPoints} pts
          </span>
        </div>
      )}

      {/* Match breakdown */}
      <section>
        <h2 className="font-headline mb-5 text-2xl font-bold tracking-tight">Detalle de Puntos</h2>
        <div className="space-y-4">
          {scored.map(({ match, prediction, points }) => {
            const homeName = teams[match.homeTeamId] ?? `#${match.homeTeamId}`
            const awayName = teams[match.awayTeamId] ?? `#${match.awayTeamId}`

            const borderColor =
              points === 5
                ? 'border-primary'
                : points === 2
                  ? 'border-tertiary-container'
                  : points === 0
                    ? 'border-error'
                    : 'border-outline-variant/30'

            const pointsColor =
              points === 5 ? 'text-primary' : points === 2 ? 'text-tertiary-fixed' : 'text-error'

            const icon =
              points === 5 ? 'check_circle' : points === 2 ? 'radio_button_checked' : 'cancel'

            const label = points === 5 ? 'Exacto' : points === 2 ? 'Signo' : 'Error'

            return (
              <div
                key={match.id}
                className={`glass-panel flex items-center justify-between rounded-xl border-l-4 p-4 shadow-lg ${borderColor}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-headline text-base leading-tight font-black">
                      {homeName} {match.homeGoals ?? '?'} - {match.awayGoals ?? '?'} {awayName}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${match.isFinished ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}
                    >
                      {match.isFinished ? 'Final' : 'Pendiente'}
                    </span>
                  </div>
                  {prediction && (
                    <span className="text-on-surface-variant text-xs font-medium tracking-tighter uppercase">
                      Tu pred:{' '}
                      <span className="text-on-surface font-bold">
                        {prediction.homeGoals} - {prediction.awayGoals}
                      </span>
                    </span>
                  )}
                  {!prediction && (
                    <span className="text-on-surface-variant text-xs font-medium">
                      Sin predicción
                    </span>
                  )}
                </div>

                {points !== null && (
                  <div className="ml-4 flex shrink-0 flex-col items-end">
                    <div className={`flex items-center gap-1 ${pointsColor}`}>
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {icon}
                      </span>
                      <span className="font-headline text-xl font-black">{points}pts</span>
                    </div>
                    <span className="text-outline text-[10px] font-bold tracking-widest uppercase">
                      {label}
                    </span>
                  </div>
                )}
              </div>
            )
          })}

          {scored.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-on-surface-variant text-sm">No hay partidos para esta jornada.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
