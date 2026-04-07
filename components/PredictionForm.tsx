'use client'

import { useState } from 'react'
import type { Match, Prediction } from '../domain/types'

type Props = {
  matches: Match[]
  predictions: Prediction[]
  onSave: (prediction: Prediction) => Promise<void>
  userId: string
}

type ScoreInput = { home: string; away: string }

export function PredictionForm({ matches, predictions, onSave, userId }: Props) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const [activeRound, setActiveRound] = useState(rounds[0] ?? 5)
  const [scores, setScores] = useState<Record<number, ScoreInput>>(() => {
    const init: Record<number, ScoreInput> = {}
    for (const p of predictions) {
      init[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) }
    }
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})

  const roundMatches = matches.filter((m) => m.round === activeRound)

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
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setActiveRound(round)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeRound === round
                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            J{round}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {roundMatches.map((match) => {
          const isFinished = match.isFinished
          const score = scores[match.id] ?? { home: '', away: '' }
          const isSaving = saving[match.id] ?? false

          return (
            <div
              key={match.id}
              className={`rounded-lg border px-4 py-3 ${
                isFinished
                  ? 'border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
                  : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex-1 text-right text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {match.homeTeamId}
                </span>

                <div className="flex items-center gap-1.5">
                  {isFinished ? (
                    <span className="text-sm font-bold text-zinc-500 tabular-nums">
                      {match.homeGoals}–{match.awayGoals}
                    </span>
                  ) : (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score.home}
                        onChange={(e) => handleChange(match.id, 'home', e.target.value)}
                        disabled={isSaving}
                        className="h-9 w-10 rounded border border-zinc-300 bg-white text-center text-sm font-bold text-zinc-900 tabular-nums focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      />
                      <span className="text-zinc-400">–</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={score.away}
                        onChange={(e) => handleChange(match.id, 'away', e.target.value)}
                        disabled={isSaving}
                        className="h-9 w-10 rounded border border-zinc-300 bg-white text-center text-sm font-bold text-zinc-900 tabular-nums focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                      />
                    </>
                  )}
                </div>

                <span className="flex-1 text-left text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {match.awayTeamId}
                </span>

                {!isFinished && (
                  <button
                    onClick={() => handleSave(match)}
                    disabled={isSaving || score.home === '' || score.away === ''}
                    className="ml-2 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? '...' : 'Guardar'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
