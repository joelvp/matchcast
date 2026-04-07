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

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Clasificación proyectada
      </h1>
      {projected.length > 0 ? (
        <>
          <p className="text-sm text-zinc-500">
            Basada en tus predicciones. Las flechas muestran el movimiento respecto a la
            clasificación actual.
          </p>
          <StandingsTable standings={standings} projected={projected} />
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Añade predicciones para ver cómo quedaría la clasificación.
          </p>
          <StandingsTable standings={standings} />
        </>
      )}
    </div>
  )
}
