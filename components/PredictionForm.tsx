'use client'

import { useEffect, useState } from 'react'
import { getCurrentRound } from '@/domain/rounds'
import type { Match, Prediction } from '@/domain/types'

type TeamInfo = { shortName: string; shieldUrl?: string }

type Props = {
  matches: Match[]
  predictions: Prediction[]
  onSave: (prediction: Prediction) => Promise<void>
  onDelete: (matchId: number) => Promise<void>
  userId: string
  teams?: Record<number, TeamInfo>
}

type ScoreInput = { home: string; away: string }

type Participant = { userId: string; userName: string; count: number; total: number }

/** Noon (12:00) on the first match day of the round, in Spain time */
function getRoundDeadline(roundMatches: Match[]): Date {
  const earliest = roundMatches.reduce(
    (min, m) => (m.matchDate < min ? m.matchDate : min),
    roundMatches[0].matchDate,
  )
  const dateStr = new Date(earliest).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
  return new Date(`${dateStr}T12:00:00+02:00`)
}

function formatDeadline(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })
}

function formatKickoff(matchDate: string): string {
  const d = new Date(matchDate)
  const day = d.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Madrid',
  })
  const time = d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })
  return `${day} · ${time}`
}

export function PredictionForm({ matches, predictions, onSave, onDelete, userId, teams }: Props) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const [activeRound, setActiveRound] = useState(() =>
    rounds.length > 0 ? getCurrentRound(rounds, matches) : (rounds[0] ?? 5),
  )
  const [scores, setScores] = useState<Record<number, ScoreInput>>(() => {
    const init: Record<number, ScoreInput> = {}
    for (const p of predictions) {
      init[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) }
    }
    return init
  })
  const [saving, setSaving] = useState<Record<number, boolean>>({})
  const [editing, setEditing] = useState<Record<number, boolean>>({})
  const [participants, setParticipants] = useState<Participant[]>([])

  function fetchParticipants(round: number) {
    fetch(`/api/predictions/participants?round=${round}`)
      .then((r) => r.json())
      .then(setParticipants)
      .catch(() => {})
  }

  useEffect(() => {
    if (!activeRound) return
    fetchParticipants(activeRound)
  }, [activeRound])

  // Sync scores when predictions load async (initial useState only captures the first value)
  useEffect(() => {
    setScores((prev) => {
      const updates: Record<number, ScoreInput> = {}
      for (const p of predictions) {
        if (!(p.matchId in prev)) {
          updates[p.matchId] = { home: String(p.homeGoals), away: String(p.awayGoals) }
        }
      }
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [predictions])

  const roundMatches = matches.filter((m) => m.round === activeRound)
  const isRoundFinished = roundMatches.every((m) => m.isFinished)
  const deadline = roundMatches.length > 0 ? getRoundDeadline(roundMatches) : null
  const isLocked = !isRoundFinished && deadline !== null && new Date() > deadline

  async function handleChange(matchId: number, side: 'home' | 'away', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return

    const updated = { ...(scores[matchId] ?? { home: '', away: '' }), [side]: value }
    setScores((prev) => ({ ...prev, [matchId]: updated }))

    // Auto-save only for new predictions, not when editing an existing one
    if (updated.home === '' || updated.away === '' || saving[matchId] || editing[matchId]) return

    setSaving((prev) => ({ ...prev, [matchId]: true }))
    try {
      await onSave({
        userId,
        matchId,
        homeGoals: parseInt(updated.home, 10),
        awayGoals: parseInt(updated.away, 10),
      })
      if (activeRound) fetchParticipants(activeRound)
    } finally {
      setSaving((prev) => ({ ...prev, [matchId]: false }))
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

      {/* Deadline / lock banner */}
      {!isRoundFinished && deadline && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-3 ${
            isLocked
              ? 'border-error/20 bg-error/5'
              : 'border-outline-variant/20 bg-surface-container-low'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[20px] ${isLocked ? 'text-error' : 'text-on-surface-variant'}`}
            style={{ fontVariationSettings: isLocked ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isLocked ? 'lock' : 'schedule'}
          </span>
          <p className={`text-xs font-bold ${isLocked ? 'text-error' : 'text-on-surface-variant'}`}>
            {isLocked
              ? `Plazo cerrado · ${formatDeadline(deadline)}`
              : `Cierre de predicciones: ${formatDeadline(deadline)}`}
          </p>
        </div>
      )}

      {/* Match cards */}
      <div className={`space-y-6 ${isLocked ? 'opacity-60' : ''}`}>
        {roundMatches.map((match) => {
          const isFinished = match.isFinished
          const score = scores[match.id] ?? { home: '', away: '' }
          const isSaving = saving[match.id] ?? false
          const prediction = predictions.find((p) => p.matchId === match.id)
          const hasPrediction = !!prediction
          const isEditing = editing[match.id] ?? false
          const homeTeam = teams?.[match.homeTeamId]
          const awayTeam = teams?.[match.awayTeamId]
          const homeName = homeTeam?.shortName ?? `#${match.homeTeamId}`
          const awayName = awayTeam?.shortName ?? `#${match.awayTeamId}`
          const homeInitial = homeName.slice(0, 2).toUpperCase()
          const awayInitial = awayName.slice(0, 2).toUpperCase()

          // Finished match — read-only
          if (isFinished) {
            return (
              <div
                key={match.id}
                className="bg-surface-container-low relative overflow-hidden rounded-xl p-6 opacity-60"
              >
                <p className="text-on-surface-variant mb-3 text-center text-[11px] font-bold tracking-widest uppercase">
                  {formatKickoff(match.matchDate)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {homeTeam?.shieldUrl ? (
                        <img
                          src={homeTeam.shieldUrl}
                          alt={homeName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        homeInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {homeName}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    {prediction ? (
                      <>
                        <div className="font-headline text-primary flex items-center gap-2 text-3xl font-black tracking-tighter">
                          <span>{prediction.homeGoals}</span>
                          <span className="text-outline-variant text-xl">-</span>
                          <span>{prediction.awayGoals}</span>
                        </div>
                        <span className="text-on-surface-variant text-[10px] font-black tracking-widest uppercase">
                          Tu predicción
                        </span>
                      </>
                    ) : (
                      <span className="text-on-surface-variant text-sm font-medium">
                        Sin predicción
                      </span>
                    )}
                  </div>
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {awayTeam?.shieldUrl ? (
                        <img
                          src={awayTeam.shieldUrl}
                          alt={awayName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        awayInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {awayName}
                    </span>
                  </div>
                </div>
              </div>
            )
          }

          // Prediction saved and not editing (or locked) — show fixed result
          if (hasPrediction && (!isEditing || isLocked)) {
            return (
              <div
                key={match.id}
                className="bg-surface-container-low relative overflow-hidden rounded-xl p-6"
              >
                <p className="text-on-surface-variant mb-3 text-center text-[11px] font-bold tracking-widest uppercase">
                  {formatKickoff(match.matchDate)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {homeTeam?.shieldUrl ? (
                        <img
                          src={homeTeam.shieldUrl}
                          alt={homeName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        homeInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {homeName}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="font-headline text-primary flex items-center gap-2 text-3xl font-black tracking-tighter">
                      <span>{prediction.homeGoals}</span>
                      <span className="text-outline-variant text-xl">-</span>
                      <span>{prediction.awayGoals}</span>
                    </div>
                    <span className="text-on-surface-variant text-[10px] font-black tracking-widest uppercase">
                      Tu predicción
                    </span>
                  </div>
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {awayTeam?.shieldUrl ? (
                        <img
                          src={awayTeam.shieldUrl}
                          alt={awayName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        awayInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {awayName}
                    </span>
                  </div>
                </div>
                {!isLocked && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setEditing((prev) => ({ ...prev, [match.id]: true }))}
                      className="text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Modificar
                    </button>
                  </div>
                )}
              </div>
            )
          }

          // Locked + no prediction — show empty card (no form)
          if (isLocked && !hasPrediction) {
            return (
              <div
                key={match.id}
                className="bg-surface-container-low relative overflow-hidden rounded-xl p-6"
              >
                <p className="text-on-surface-variant mb-3 text-center text-[11px] font-bold tracking-widest uppercase">
                  {formatKickoff(match.matchDate)}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {homeTeam?.shieldUrl ? (
                        <img
                          src={homeTeam.shieldUrl}
                          alt={homeName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        homeInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {homeName}
                    </span>
                  </div>
                  <span className="text-outline-variant font-black">VS</span>
                  <div className="flex w-1/3 flex-col items-center gap-2">
                    <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                      {awayTeam?.shieldUrl ? (
                        <img
                          src={awayTeam.shieldUrl}
                          alt={awayName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        awayInitial
                      )}
                    </div>
                    <span className="font-headline text-center text-sm font-bold uppercase">
                      {awayName}
                    </span>
                  </div>
                </div>
                <p className="text-on-surface-variant mt-4 text-center text-xs font-medium">
                  Sin predicción
                </p>
              </div>
            )
          }

          // No prediction or editing — show inputs
          return (
            <div
              key={match.id}
              className="bg-surface-container-low relative overflow-hidden rounded-xl p-6"
            >
              <p className="text-on-surface-variant mb-3 text-center text-[11px] font-bold tracking-widest uppercase">
                {formatKickoff(match.matchDate)}
              </p>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex w-1/3 flex-col items-center gap-2">
                  <div className="bg-surface-variant flex h-12 w-12 items-center justify-center rounded-lg text-sm font-black">
                    {homeTeam?.shieldUrl ? (
                      <img
                        src={homeTeam.shieldUrl}
                        alt={homeName}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      homeInitial
                    )}
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
                    {awayTeam?.shieldUrl ? (
                      <img
                        src={awayTeam.shieldUrl}
                        alt={awayName}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      awayInitial
                    )}
                  </div>
                  <span className="font-headline text-center text-sm font-bold uppercase">
                    {awayName}
                  </span>
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => {
                      setEditing((prev) => ({ ...prev, [match.id]: false }))
                      setScores((prev) => ({
                        ...prev,
                        [match.id]: {
                          home: String(prediction!.homeGoals),
                          away: String(prediction!.awayGoals),
                        },
                      }))
                    }}
                    disabled={isSaving}
                    className="font-headline text-on-surface-variant border-outline-variant/30 flex items-center justify-center rounded-xl border px-4 py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                  <button
                    onClick={async () => {
                      await onDelete(match.id)
                      setScores((prev) => {
                        const next = { ...prev }
                        delete next[match.id]
                        return next
                      })
                      setEditing((prev) => ({ ...prev, [match.id]: false }))
                      if (activeRound) fetchParticipants(activeRound)
                    }}
                    disabled={isSaving}
                    className="font-headline bg-error/10 text-error rounded-xl px-5 py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? '...' : 'Borrar'}
                  </button>
                  <button
                    onClick={async () => {
                      if (score.home === '' || score.away === '') return
                      setSaving((prev) => ({ ...prev, [match.id]: true }))
                      try {
                        await onSave({
                          userId,
                          matchId: match.id,
                          homeGoals: parseInt(score.home, 10),
                          awayGoals: parseInt(score.away, 10),
                        })
                        setEditing((prev) => ({ ...prev, [match.id]: false }))
                        if (activeRound) fetchParticipants(activeRound)
                      } finally {
                        setSaving((prev) => ({ ...prev, [match.id]: false }))
                      }
                    }}
                    disabled={isSaving || score.home === '' || score.away === ''}
                    className="font-headline bg-primary-container text-on-primary-fixed flex-1 rounded-xl py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? '...' : 'Actualizar'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ya han predicho */}
      {participants.length > 0 && (
        <div className="border-outline-variant/10 rounded-xl border p-4">
          <p className="text-on-surface-variant mb-3 text-[10px] font-bold tracking-widest uppercase">
            Ya han predicho J{activeRound}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {participants.slice(0, 5).map((p) => (
                <div
                  key={p.userId}
                  className="bg-surface-container-highest font-headline border-surface flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-black"
                >
                  {p.userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              ))}
              {participants.length > 5 && (
                <div className="bg-surface-container-high border-surface text-on-surface-variant flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold">
                  +{participants.length - 5}
                </div>
              )}
            </div>
            <span className="text-on-surface-variant text-sm">
              {participants.length === 1
                ? `${participants[0].userName} ya ha predicho`
                : participants.length === 2
                  ? `${participants[0].userName} y ${participants[1].userName}`
                  : `${participants[0].userName} y ${participants.length - 1} más`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
