'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { StandingsTable } from '@/components/StandingsTable'
import { useAuth } from '@/components/AuthProvider'
import { fetcher } from '@/lib/fetcher'
import type { Match, Prediction, TeamStanding } from '@/domain/types'
import { calculateInitialStandings, calculateProjectedStandings } from '@/domain/standings'

const ORDINALS = [
  'primeros',
  'segundos',
  'terceros',
  'cuartos',
  'quintos',
  'sextos',
  'séptimos',
  'octavos',
]
const toOrdinal = (n: number) => ORDINALS[n - 1] ?? `${n}º`

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
  const allFinishedMatches = matches.filter((m) => m.isFinished || m.isLive)
  const initialStandings = calculateInitialStandings(standingsData, allFinishedMatches)

  // Standings up to and including the selected round
  const matchesUpToRound = matches.filter((m) => m.round <= currentRound)
  // Fully-finished rounds excluding the selected one → always use real results in predictions tab
  const realRounds = new Set(
    rounds.filter(
      (r) => r !== currentRound && matches.filter((m) => m.round === r).every((m) => m.isFinished),
    ),
  )

  const projected = calculateProjectedStandings(
    initialStandings,
    predictionsData,
    matchesUpToRound,
    realRounds,
  )
  const real = calculateProjectedStandings(initialStandings, [], matchesUpToRound)
  const realPrevious = calculateProjectedStandings(
    initialStandings,
    [],
    matches.filter((m) => m.round < currentRound),
  )

  // Badge state based on selected round
  const roundMatches = matches.filter((m) => m.round === currentRound)
  const roundFinishedCount = roundMatches.filter((m) => m.isFinished).length
  const roundLiveCount = roundMatches.filter((m) => m.isLive).length
  const roundAllFinished = roundMatches.length > 0 && roundFinishedCount === roundMatches.length
  const roundSomeFinished = (roundFinishedCount > 0 || roundLiveCount > 0) && !roundAllFinished
  const roundHasPredictions = roundMatches.some((m) =>
    predictionsData.some((p) => p.matchId === m.id),
  )

  const badge = !roundHasPredictions
    ? ('pending' as const)
    : roundAllFinished
      ? ('prediction-final' as const)
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

  // Insight card data
  const isLastRound = currentRound === rounds[rounds.length - 1]
  const relegatedInProjected = projected.slice(-2)
  const ginerIndex = projected.findIndex((s) => s.shortName === 'Giner')
  const ginerStanding = projected[ginerIndex]
  const ginerPos = ginerIndex + 1
  const pointsToLeader = (projected[0]?.points ?? 0) - (ginerStanding?.points ?? 0)
  const pointsToRelegation =
    (ginerStanding?.points ?? 0) - (projected[projected.length - 2]?.points ?? 0)

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section>
        <h1 className="font-headline text-4xl leading-tight font-extrabold tracking-tighter uppercase">
          <span className="text-primary">Clasificación</span>
        </h1>
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
          standings={realPrevious}
          projected={showReal ? real : projected}
          title={showReal ? 'Clasificación Real' : 'Clasificación Proyectada'}
          badge={showReal ? realBadge : badge}
          showBadgeInfo
          infoContext={showReal ? 'real' : 'predictions'}
        />
      </section>

      {/* Insight cards */}
      {!showReal && projected.length >= 2 && (
        <div className="space-y-3">
          {/* Card 1: Descenso */}
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_downward
              </span>
              <span className="font-headline text-on-surface-variant text-xs font-bold tracking-widest uppercase">
                Descenso
              </span>
            </div>
            <p className="text-on-surface text-sm leading-relaxed">
              {isLastRound ? (
                <>
                  <span className="text-secondary font-bold">
                    {relegatedInProjected[0]?.shortName}
                  </span>{' '}
                  y{' '}
                  <span className="text-secondary font-bold">
                    {relegatedInProjected[1]?.shortName}
                  </span>{' '}
                  descienden.
                </>
              ) : (
                <>
                  {roundHasPredictions ? 'Con tus predicciones, ' : 'Ahora mismo, '}
                  <span className="text-secondary font-bold">
                    {relegatedInProjected[0]?.shortName}
                  </span>{' '}
                  y{' '}
                  <span className="text-secondary font-bold">
                    {relegatedInProjected[1]?.shortName}
                  </span>{' '}
                  están en zona de descenso.
                </>
              )}
            </p>
          </div>

          {/* Card 2: Giner */}
          {ginerStanding && (
            <div className="glass-panel rounded-xl p-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  insights
                </span>
                <span className="font-headline text-on-surface-variant text-xs font-bold tracking-widest uppercase">
                  Giner
                </span>
              </div>
              <p className="text-on-surface text-sm leading-relaxed">
                {isLastRound ? (
                  <>
                    Acabamos <span className="text-tertiary font-bold">{toOrdinal(ginerPos)}</span>.
                    {pointsToLeader > 0
                      ? ` A ${pointsToLeader} ${pointsToLeader === 1 ? 'punto' : 'puntos'} del campeón`
                      : ' Somos campeones'}
                    {pointsToRelegation > 0
                      ? ` y a ${pointsToRelegation} ${pointsToRelegation === 1 ? 'punto' : 'puntos'} del descenso`
                      : pointsToRelegation === 0
                        ? ', empatados con la zona de descenso'
                        : ', en zona de descenso'}
                    .
                  </>
                ) : (
                  <>
                    Estamos <span className="text-tertiary font-bold">{toOrdinal(ginerPos)}</span>
                    {pointsToLeader > 0
                      ? `, a ${pointsToLeader} ${pointsToLeader === 1 ? 'punto' : 'puntos'} del líder`
                      : ', líderes de la clasificación'}
                    {pointsToRelegation > 0
                      ? ` y a ${pointsToRelegation} ${pointsToRelegation === 1 ? 'punto' : 'puntos'} del descenso`
                      : pointsToRelegation === 0
                        ? ', empatados con la zona de descenso'
                        : `, en zona de descenso, a ${Math.abs(pointsToRelegation)} ${Math.abs(pointsToRelegation) === 1 ? 'punto' : 'puntos'} de la permanencia`}
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
