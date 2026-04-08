'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardEntry, Match, Prediction, TeamStanding } from '../../domain/types'
import { scorePrediction } from '../../domain/leaderboard'
import { getCurrentRound } from '../../domain/rounds'

type ScoredMatch = {
  match: Match
  prediction: Prediction | undefined
  points: number | null
}

export default function MyRoundPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [teams, setTeams] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [activeRound, setActiveRound] = useState<number | null>(null)
  const [roundRanking, setRoundRanking] = useState<LeaderboardEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null)
  const [selectedPredictions, setSelectedPredictions] = useState<Prediction[]>([])
  const [loadingModal, setLoadingModal] = useState(false)

  useEffect(() => {
    setUserId(localStorage.getItem('matchcast_user_id'))
  }, [])

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)
      const [matchesRes, predictionsRes, standingsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${userId}`),
        fetch('/api/standings'),
      ])
      const [matchesData, predictionsData, standingsData]: [Match[], Prediction[], TeamStanding[]] =
        await Promise.all([matchesRes.json(), predictionsRes.json(), standingsRes.json()])

      const predictableMatches = matchesData.filter((m) => m.round >= 5)
      setMatches(predictableMatches)
      setPredictions(predictionsData)
      setTeams(Object.fromEntries(standingsData.map((s) => [s.teamId, s.shortName])))

      const rounds = [...new Set(predictableMatches.map((m) => m.round))].sort()
      setActiveRound(rounds.length > 0 ? getCurrentRound(rounds, predictableMatches) : null)
      setLoading(false)
    }

    load()
  }, [userId])

  useEffect(() => {
    if (!activeRound) return
    fetch(`/api/leaderboard?round=${activeRound}`)
      .then((r) => r.json())
      .then(setRoundRanking)
      .catch(() => {})
  }, [activeRound])

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

  async function openUserModal(entry: LeaderboardEntry) {
    setSelectedEntry(entry)
    setSelectedPredictions([])
    setLoadingModal(true)
    const res = await fetch(`/api/predictions?userId=${entry.userId}`)
    const data: Prediction[] = await res.json()
    setSelectedPredictions(data.filter((p) => roundMatches.some((m) => m.id === p.matchId)))
    setLoadingModal(false)
  }

  return (
    <div className="space-y-8">
      {/* User predictions modal */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-surface-container-highest font-headline flex h-10 w-10 items-center justify-center rounded-full font-black">
                  {selectedEntry.userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="font-headline text-lg font-black tracking-tight uppercase">
                    {selectedEntry.userName}
                  </h2>
                  <p className="text-primary text-sm font-bold">
                    {selectedEntry.totalPoints} pts · J{activeRound}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {loadingModal ? (
              <div className="flex justify-center py-6">
                <span className="font-headline text-primary-container text-3xl font-black">
                  •••
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {roundMatches.map((match) => {
                  const homeName = teams[match.homeTeamId] ?? `#${match.homeTeamId}`
                  const awayName = teams[match.awayTeamId] ?? `#${match.awayTeamId}`
                  const pred = selectedPredictions.find((p) => p.matchId === match.id)
                  const breakdown = selectedEntry.breakdown.find((b) => b.matchId === match.id)
                  const points = breakdown?.points ?? null
                  const borderColor =
                    points === 5
                      ? 'border-primary'
                      : points === 2
                        ? 'border-tertiary-container'
                        : points === 0
                          ? 'border-error'
                          : 'border-outline-variant/20'
                  return (
                    <div
                      key={match.id}
                      className={`bg-surface-container-low flex items-center justify-between rounded-xl border-l-4 px-4 py-3 ${borderColor}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-headline text-sm font-black">
                          {match.isFinished
                            ? `${homeName} ${match.homeGoals}-${match.awayGoals} ${awayName}`
                            : `${homeName} - ${awayName}`}
                        </p>
                        <p className="text-on-surface-variant text-xs">
                          {pred ? (
                            <>
                              Pred:{' '}
                              <span className="text-on-surface font-bold">
                                {pred.homeGoals}-{pred.awayGoals}
                              </span>
                            </>
                          ) : (
                            'Sin predicción'
                          )}
                        </p>
                      </div>
                      {points !== null && (
                        <span
                          className={`font-headline ml-3 shrink-0 font-black ${
                            points === 5
                              ? 'text-primary'
                              : points === 2
                                ? 'text-tertiary-container'
                                : 'text-error'
                          }`}
                        >
                          {points}pts
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-headline text-xl font-black tracking-tight uppercase">
                Cómo se puntúa
              </h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-surface-container-low flex items-center gap-4 rounded-xl p-4">
                <span
                  className="material-symbols-outlined text-primary shrink-0 text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div>
                  <p className="font-headline font-black">
                    Resultado exacto <span className="text-primary">5 pts</span>
                  </p>
                  <p className="text-on-surface-variant text-sm">Predices 2-1 y acaba 2-1.</p>
                </div>
              </div>
              <div className="bg-surface-container-low flex items-center gap-4 rounded-xl p-4">
                <span
                  className="material-symbols-outlined text-tertiary-container shrink-0 text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  radio_button_checked
                </span>
                <div>
                  <p className="font-headline font-black">
                    Signo correcto <span className="text-tertiary-container">2 pts</span>
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    Aciertas quién gana o el empate, pero no el marcador exacto.
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-low flex items-center gap-4 rounded-xl p-4">
                <span
                  className="material-symbols-outlined text-error shrink-0 text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  cancel
                </span>
                <div>
                  <p className="font-headline font-black">
                    Error <span className="text-error">0 pts</span>
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    El resultado no coincide con tu predicción.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-4xl leading-none font-extrabold tracking-tighter uppercase">
          Mi <span className="text-primary">Jornada</span>
        </h1>
        <button
          onClick={() => setShowHelp(true)}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Cómo se puntúa"
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            help
          </span>
        </button>
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
              points === 5
                ? 'text-primary'
                : points === 2
                  ? 'text-tertiary-container'
                  : 'text-error'

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
                      {match.isFinished
                        ? `${homeName} ${match.homeGoals} - ${match.awayGoals} ${awayName}`
                        : `${homeName} - ${awayName}`}
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

        {roundIsFinished && scored.some((s) => s.points !== null) && (
          <div className="bg-surface-container-low mt-4 flex items-center justify-between rounded-xl px-5 py-4">
            <span className="font-headline text-on-surface-variant text-sm font-bold tracking-widest uppercase">
              Total jornada
            </span>
            <span className="font-headline text-primary-container text-2xl font-black">
              {totalPoints} pts
            </span>
          </div>
        )}
      </section>

      {/* Mini-ranking de la jornada */}
      {roundRanking.length > 0 && roundMatches.some((m) => m.isFinished) && (
        <section>
          <h2 className="font-headline mb-4 text-2xl font-bold tracking-tight">
            Ranking J{activeRound}
          </h2>
          <div className="space-y-2">
            {roundRanking.map((entry, idx) => {
              const isMe = entry.userId === userId
              const initials = entry.userName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
              return (
                <div
                  key={entry.userId}
                  onClick={() => !isMe && openUserModal(entry)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                    isMe
                      ? 'border-primary bg-primary/5 border-l-4'
                      : 'bg-surface-container-low hover:bg-surface-container cursor-pointer'
                  }`}
                >
                  <span className="font-headline text-on-surface-variant w-5 text-sm font-bold">
                    {idx + 1}
                  </span>
                  <div className="bg-surface-container-highest font-headline flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black">
                    {initials}
                  </div>
                  <span
                    className={`font-headline flex-1 truncate font-bold ${isMe ? 'text-primary' : 'text-on-surface'}`}
                  >
                    {isMe ? 'Tú' : entry.userName}
                  </span>
                  <span className="font-headline text-on-surface font-black tabular-nums">
                    {entry.totalPoints} pts
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
