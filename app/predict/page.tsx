'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PredictionForm } from '../../components/PredictionForm'
import { useAuth } from '../../components/AuthProvider'
import type { Match, Prediction, TeamStanding } from '../../domain/types'

export default function PredictPage() {
  const router = useRouter()
  const { userId, userName, loading: authLoading } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [teams, setTeams] = useState<Record<number, { shortName: string; shieldUrl?: string }>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && (!userId || !userName)) {
      router.push('/login')
    }
  }, [authLoading, userId, userName, router])

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)
      const [matchesRes, predictionsRes, standingsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${userId}`),
        fetch('/api/standings'),
      ])
      const [matchesData, predictionsData, standingsData] = await Promise.all([
        matchesRes.json(),
        predictionsRes.json(),
        standingsRes.json(),
      ])
      setMatches((matchesData as Match[]).filter((m) => m.round >= 5))
      setPredictions(predictionsData)
      setTeams(
        Object.fromEntries(
          (standingsData as TeamStanding[]).map((s) => [
            s.teamId,
            { shortName: s.shortName, shieldUrl: s.shieldUrl },
          ]),
        ),
      )
      setLoading(false)
    }

    load()
  }, [userId])

  async function handleSave(prediction: Prediction) {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prediction),
    })
    setPredictions((prev) => [...prev.filter((p) => p.matchId !== prediction.matchId), prediction])
  }

  async function handleDelete(matchId: number) {
    await fetch('/api/predictions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, matchId }),
    })
    setPredictions((prev) => prev.filter((p) => p.matchId !== matchId))
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="font-headline text-primary-container text-4xl font-black">•••</div>
          <p className="text-on-surface-variant text-sm">Cargando partidos…</p>
        </div>
      </div>
    )
  }

  const pendingCount = matches.filter(
    (m) => !m.isFinished && !predictions.find((p) => p.matchId === m.id),
  ).length
  const totalPending = matches.filter((m) => !m.isFinished).length
  const progressPct = totalPending > 0 ? ((totalPending - pendingCount) / totalPending) * 100 : 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">
          Predecir
        </h1>
        <span className="bg-surface-container-high text-on-surface-variant rounded-full px-3 py-1 text-xs font-bold">
          {userName}
        </span>
      </div>

      {/* Progress banner */}
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

      <PredictionForm
        matches={matches}
        predictions={predictions}
        onSave={handleSave}
        onDelete={handleDelete}
        userId={userId!}
        teams={teams}
      />
    </div>
  )
}
