'use client'

import { useEffect, useState } from 'react'
import { StandingsTable } from '../../components/StandingsTable'
import type { Match, Prediction, TeamStanding } from '../../domain/types'
import { calculateProjectedStandings } from '../../domain/standings'

export default function StandingsPage() {
  const [standings, setStandings] = useState<TeamStanding[]>([])
  const [projected, setProjected] = useState<TeamStanding[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = localStorage.getItem('matchcast_user_id')

    async function load() {
      setLoading(true)
      const [standingsRes, matchesRes] = await Promise.all([
        fetch('/api/standings'),
        fetch('/api/matches'),
      ])
      const [standingsData, matchesData]: [TeamStanding[], Match[]] = await Promise.all([
        standingsRes.json(),
        matchesRes.json(),
      ])

      setStandings(standingsData)

      if (userId) {
        const predictionsRes = await fetch(`/api/predictions?userId=${userId}`)
        const predictionsData: Prediction[] = await predictionsRes.json()
        const proj = calculateProjectedStandings(standingsData, predictionsData, matchesData)
        setProjected(proj)
      }

      setLoading(false)
    }

    load()
  }, [])

  const hasProjection = projected.length > 0

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="font-headline text-primary-container text-4xl font-black">•••</div>
          <p className="text-on-surface-variant text-sm">Calculando proyección…</p>
        </div>
      </div>
    )
  }

  const topTeam = hasProjection
    ? [...projected].sort((a, b) => b.points - a.points)[0]
    : standings[0]

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
          Visualiza el impacto de tus análisis en la tabla final de la liga.
        </p>
      </section>

      {/* Table */}
      <section>
        <StandingsTable
          standings={standings}
          projected={hasProjection ? projected : undefined}
          title="Clasificación Proyectada"
          badge={hasProjection ? 'live' : 'pending'}
        />
      </section>

      {/* Insight card */}
      {topTeam && (
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
                Insights del algoritmo
              </span>
            </div>
            <p className="text-on-surface text-sm leading-relaxed">
              {hasProjection ? (
                <>
                  Según tus predicciones,{' '}
                  <span className="text-primary font-bold">{topTeam.shortName}</span> lideraría la
                  clasificación con{' '}
                  <span className="text-primary-container font-bold">{topTeam.points} puntos</span>.
                  Los 2 primeros acceden a la fase final.
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
