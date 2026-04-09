'use client'

import useSWR from 'swr'
import { StandingsTable } from '@/components/StandingsTable'
import { useAuth } from '@/components/AuthProvider'
import { fetcher } from '@/lib/fetcher'
import type { Match, Prediction, TeamStanding } from '@/domain/types'
import { calculateProjectedStandings } from '@/domain/standings'

export default function StandingsPage() {
  const { userId, loading: authLoading } = useAuth()

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

  const projected =
    standingsData.length > 0 && predictionsData.length > 0
      ? calculateProjectedStandings(standingsData, predictionsData, matchesData)
      : []
  const hasProjection = projected.length > 0

  const pendingMatches = matches.filter((m) => !m.isFinished)
  const pendingCount = pendingMatches.filter(
    (m) => !predictionsData.find((p) => p.matchId === m.id),
  ).length
  const progressPct =
    pendingMatches.length > 0
      ? ((pendingMatches.length - pendingCount) / pendingMatches.length) * 100
      : 100

  const sortedProjected = [...(hasProjection ? projected : standingsData)].sort((a, b) => {
    const pd = b.points - a.points
    if (pd !== 0) return pd
    const gda = a.goalsFor - a.goalsAgainst
    const gdb = b.goalsFor - b.goalsAgainst
    if (gdb !== gda) return gdb - gda
    return b.goalsFor - a.goalsFor
  })

  const relegatedTeams = sortedProjected.slice(-2).reverse()

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

      {/* Pending predictions banner */}
      {pendingCount > 0 && (
        <div className="border-outline-variant/10 bg-surface-container-low flex items-center gap-3 rounded-xl border p-4 shadow-lg">
          <div className="bg-secondary/10 text-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
            <span className="material-symbols-outlined text-[20px]">pending_actions</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-on-surface text-sm font-bold">
              {pendingCount === 1
                ? 'Te falta 1 partido por predecir'
                : `Te faltan ${pendingCount} partidos por predecir`}
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

      {/* Table */}
      <section>
        <StandingsTable
          standings={standingsData}
          projected={hasProjection ? projected : undefined}
          title="Clasificación Proyectada"
          badge={hasProjection ? 'live' : 'pending'}
        />
      </section>

      {/* Insight card */}
      {relegatedTeams.length > 0 && (
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
              {hasProjection ? (
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
