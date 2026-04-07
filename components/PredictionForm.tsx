'use client'

import { useState } from 'react'
import type { Match, Prediction } from '../domain/types'

type Props = {
  matches: Match[]
  predictions: Prediction[]
  onSave: (prediction: Prediction) => Promise<void>
  userId: string
  teams?: Record<number, string>
}

type ScoreInput = { home: string; away: string }

export function PredictionForm({ matches, predictions, onSave, userId, teams }: Props) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const firstPendingRound =
    rounds.find((r) =>
      matches
        .filter((m) => m.round === r && !m.isFinished)
        .some((m) => !predictions.find((p) => p.matchId === m.id)),
    ) ?? rounds[0]
  const [activeRound, setActiveRound] = useState(firstPendingRound ?? rounds[0] ?? 5)
  const [scores, setScores] = useState<Record<number, ScoreInput>>(() => {
    const init: Record<number, ScoreInput> = {}
    for (const p of predictions) {
      init[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) }
    }
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  const roundMatches = matches.filter((m) => m.round === activeRound)
  const isRoundFinished = roundMatches.every((m) => m.isFinished)

  function handleChange(matchId: number, side: 'home' | 'away', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return
    setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }))
  }

  async function handleSave(match: Match) {
    const score = scores[match.id]
    if (!score || score.home === '' || score.away === '') return

    setSaving((prev) => ({ ...prev, [match.id]: true }))
    try {
      await onSave({
        userId,
        matchId: match.id,
        homeGoals: parseInt(score.home, 10),
        awayGoals: parseInt(score.away, 10),
      })
    } finally {
      setSaving((prev) => ({ ...prev, [match.id]: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Round tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {rounds.map((round) => {
          const roundDone = matches
            .filter((m) => m.round === round && !m.isFinished)
            .every((m) => predictions.find((p) => p.matchId === m.id))
          const isActive = activeRound === round
          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={`rounded-full px-6 py-2 text-xs font-bold tracking-widest whitespace-nowrap uppercase transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-primary text-on-primary shadow-md'
                  : roundDone
                    ? 'border-outline-variant/30 text-on-surface-variant border opacity-50'
                    : 'border-outline-variant/30 text-on-surface-variant border'
              }`}
            >
              J{round}
            </button>
          )
        })}
      </div>

      {/* Section header */}
      <div className="flex items-end justify-between">
        <h2 className="font-headline text-3xl font-bold tracking-tighter uppercase">
          Jornada {activeRound}
        </h2>
        <span className="text-on-surface-variant text-xs font-bold tracking-widest uppercase">
          {isRoundFinished ? 'Finalizada' : 'Próximos'}
        </span>
      </div>

      {/* Match cards */}
      <div className="space-y-6">
        {roundMatches.map((match) => {
          const isFinished = match.isFinished
          const score = scores[match.id] ?? { home: '', away: '' }
          const isSaving = saving[match.id] ?? false
          const hasPrediction = !!predictions.find((p) => p.matchId === match.id)
          const homeName = teams?.[match.homeTeamId] ?? `#${match.homeTeamId}`
          const awayName = teams?.[match.awayTeamId] ?? `#${match.awayTeamId}`
          const homeInitial = homeName.slice(0, 2).toUpperCase()
          const awayInitial = awayName.slice(0, 2).toUpperCase()

          if (isFinished) {
            return (
              <div
                key={match.id}
                className="bg-surface-container-low relative overflow-hidden rounded-xl p-6 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {homeInitial}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {homeName}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-headline flex items-center gap-2 text-3xl font-black tracking-tighter">
                      <span>{match.homeGoals}</span>
                      <span className="text-outline-variant text-xl">-</span>
                      <span>{match.awayGoals}</span>
                    </div>
                    <span className="text-on-surface-variant text-[10px] font-black tracking-widest uppercase">
                      Resultado real
                    </span>
                  </div>
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {awayInitial}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {awayName}
                    </span>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={match.id}
              className="bg-surface-container-low relative overflow-hidden rounded-xl p-6"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex w-1/3 flex-col items-center gap-2">
                  <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                    {homeInitial}
                  </div>
                  <span className="font-headline text-center text-sm font-bold uppercase">
                    {homeName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={score.home}
                    onChange={(e) => handleChange(match.id, 'home', e.target.value)}
                    disabled={isSaving}
                    placeholder="0"
                    className="font-headline bg-surface-container-high text-primary focus:ring-primary-container h-16 w-14 rounded-xl border-none p-0 text-center text-3xl font-black focus:ring-2 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-outline-variant font-black">VS</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={score.away}
                    onChange={(e) => handleChange(match.id, 'away', e.target.value)}
                    disabled={isSaving}
                    placeholder="0"
                    className="font-headline bg-surface-container-high text-primary focus:ring-primary-container h-16 w-14 rounded-xl border-none p-0 text-center text-3xl font-black focus:ring-2 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="flex w-1/3 flex-col items-center gap-2">
                  <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                    {awayInitial}
                  </div>
                  <span className="font-headline text-center text-sm font-bold uppercase">
                    {awayName}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => handleSave(match)}
                  disabled={isSaving || score.home === '' || score.away === ''}
                  className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? '...' : hasPrediction ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
