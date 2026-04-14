'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { StandingsTable } from '@/components/StandingsTable'
import { useAuth } from '@/components/AuthProvider'
import { fetcher } from '@/lib/fetcher'
import type { Match, Prediction, TeamStanding } from '@/domain/types'
import { calculateInitialStandings, calculateProjectedStandings } from '@/domain/standings'

export default function StandingsPage() {
  const { userId, loading: authLoading } = useAuth()
  const [showReal, setShowReal] = useState(false)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  const ready = !authLoading

  const { data: standings, isLoading } = useSWR<TeamStanding[]>(
    ready ? '/api/standings' : null,
    fetcher,
  )
  const { data: allMatches } = useSWR<Match[]>(ready ? '/api/matches' : null, fetcher)
  const { data: predictions } = useSWR<Prediction[]>(
    ready && userId ? `/api/predictions?userId=${userId}` : null,
    fetcher,
  )

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="font-headline text-primary-container text-4xl font-black">•••</div>
          <p className="text-on-surface-variant text-sm">Calculando proyección…</p>
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <span
          className="material-symbols-outlined text-on-surface-variant text-4xl"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          bar_chart
        </span>
        <p className="text-on-surface-variant text-sm">
          Regístrate en <span className="text-primary font-bold">Predecir</span> para ver tu
          proyección.
        </p>
      </div>
    )
  }

  const standingsData = standings ?? []
  const matchesData = allMatches ?? []
  const predictionsData = predictions ?? []
  const matches = matchesData.filter((m) => m.round >= 5)

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
  const activeRound =
    rounds.find((r) => matches.some((m) => m.round === r && !m.isFinished)) ??
    rounds[rounds.length - 1] ??
    5
  const currentRound = selectedRound ?? activeRound

  // Reconstruct pre-phase standings by undoing all finished matches
  const allFinishedMatches = matches.filter((m) => m.isFinished)
  const initialStandings = calculateInitialStandings(standingsData, allFinishedMatches)

  // Standings up to and including the selected round
  const matchesUpToRound = matches.filter((m) => m.round <= currentRound)
  const projected = calculateProjectedStandings(initialStandings, predictionsData, matchesUpToRound)
  const real = calculateProjectedStandings(initialStandings, [], matchesUpToRound)

  // Badge state based on selected round
  const roundMatches = matches.filter((m) => m.round === currentRound)
  const roundFinishedCount = roundMatches.filter((m) => m.isFinished).length
  const roundAllFinished = roundMatches.length > 0 && roundFinishedCount === roundMatches.length
  const roundSomeFinished = roundFinishedCount > 0 && !roundAllFinished
  const roundHasPredictions = roundMatches.some((m) =>
    predictionsData.some((p) => p.matchId === m.id),
  )

  const badge = !roundHasPredictions
    ? ('pending' as const)
    : roundAllFinished
      ? ('final' as const)
      : roundSomeFinished
        ? ('live' as const)
        : ('projection' as const)

  const realBadge = roundAllFinished
    ? ('real-final' as const)
    : roundSomeFinished
      ? ('live' as const)
      : ('real-pending' as const)

  // Pending predictions for the selected round
  const pendingRoundMatches = roundMatches.filter((m) => !m.isFinished)
  const pendingCount = pendingRoundMatches.filter(
    (m) => !predictionsData.some((p) => p.matchId === m.id),
  ).length
  const progressPct =
    pendingRoundMatches.length > 0
      ? ((pendingRoundMatches.length - pendingCount) / pendingRoundMatches.length) * 100
      : 100

  // Insight card: only on last round, predictions mode
  const isLastRound = currentRound === rounds[rounds.length - 1]
  const relegatedTeams = isLastRound ? [...projected].slice(-2).reverse() : []

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section>
        <h1 className="font-headline text-4xl leading-tight font-extrabold tracking-tighter uppercase">
          Proyección si tus
          <br />
          <span className="text-primary">predicciones</span>
          <br />
          se cumplen
        </h1>
        <p className="text-on-surface-variant mt-3 max-w-xs text-sm opacity-80">
          Tabla actualizada al momento en base a tus predicciones.
        </p>
      </section>

      {/* Round tabs */}
      {rounds.length > 0 && (
        <div className="flex gap-2">
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all ${
                currentRound === round
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant'
              }`}
            >
              J{round}
            </button>
          ))}
        </div>
      )}

      {/* Pending predictions banner */}
      {!showReal && pendingCount > 0 && (
        <div className="border-outline-variant/10 bg-surface-container-low flex items-center gap-3 rounded-xl border p-4 shadow-lg">
          <div className="bg-secondary/10 text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-on-surface text-sm font-bold">
              {pendingCount === 1
                ? 'Te falta 1 partido por predecir en esta jornada'
                : `Te faltan ${pendingCount} partidos por predecir en esta jornada`}
            </p>
            <div className="bg-surface-container mt-2 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <div className="bg-surface-container-low flex rounded-xl p-1">
        <button
          onClick={() => setShowReal(false)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${!showReal ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          Tus predicciones
        </button>
        <button
          onClick={() => setShowReal(true)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${showReal ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'}`}
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            sports_score
          </span>
          Resultados reales
        </button>
      </div>

      {/* Table */}
      <section>
        <StandingsTable
          standings={real}
          projected={!showReal ? projected : undefined}
          title={showReal ? 'Clasificación Real' : 'Clasificación Proyectada'}
          badge={showReal ? realBadge : badge}
          showBadgeInfo={!showReal}
        />
      </section>

      {/* Insight card: only on last round, predictions mode */}
      {!showReal && isLastRound && relegatedTeams.length > 0 && (
        <section>
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                insights
              </span>
              <span className="font-headline text-on-surface-variant text-xs font-bold tracking-widest uppercase">
                Predicción
              </span>
            </div>
            <p className="text-on-surface text-sm leading-relaxed">
              {roundHasPredictions ? (
                <>
                  Según tus predicciones, descenderían{' '}
                  <span className="text-secondary font-bold">{relegatedTeams[0]?.shortName}</span> y{' '}
                  <span className="text-secondary font-bold">{relegatedTeams[1]?.shortName}</span>.
                </>
              ) : (
                <>
                  Añade predicciones en la pestaña{' '}
                  <span className="text-primary font-bold">Predecir</span> para ver cómo afectan a
                  la clasificación final.
                </>
              )}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
