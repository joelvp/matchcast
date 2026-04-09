'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { PredictionForm } from '@/components/PredictionForm'
import { useAuth } from '@/components/AuthProvider'
import { fetcher } from '@/lib/fetcher'
import type { Match, Prediction, TeamStanding } from '@/domain/types'

export default function PredictPage() {
  const router = useRouter()
  const { userId, userName, loading: authLoading } = useAuth()

  const ready = !authLoading && !!userId

  const { data: allMatches, isLoading } = useSWR<Match[]>(ready ? '/api/matches' : null, fetcher)
  const { data: standings } = useSWR<TeamStanding[]>(ready ? '/api/standings' : null, fetcher)
  const { data: predictions, mutate: mutatePredictions } = useSWR<Prediction[]>(
    ready ? `/api/predictions?userId=${userId}` : null,
    fetcher,
  )

  async function handleSave(prediction: Prediction) {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prediction),
    })
    mutatePredictions(
      (prev) => [...(prev ?? []).filter((p) => p.matchId !== prediction.matchId), prediction],
      false,
    )
  }

  async function handleDelete(matchId: number) {
    await fetch('/api/predictions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, matchId }),
    })
    mutatePredictions((prev) => (prev ?? []).filter((p) => p.matchId !== matchId), false)
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="font-headline text-primary-container text-4xl font-black">•••</div>
          <p className="text-on-surface-variant text-sm">Cargando partidos…</p>
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
          sports_hockey
        </span>
        <p className="text-on-surface-variant text-sm">
          Inicia sesión para predecir los resultados.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="font-headline bg-primary-container text-on-primary-fixed rounded-xl px-6 py-3 font-extrabold tracking-widest uppercase"
        >
          Entrar
        </button>
      </div>
    )
  }

  const matches = (allMatches ?? []).filter((m) => m.round >= 5)
  const preds = predictions ?? []
  const teams = Object.fromEntries(
    (standings ?? []).map((s) => [s.teamId, { shortName: s.shortName, shieldUrl: s.shieldUrl }]),
  )

  const pendingCount = matches.filter(
    (m) => !m.isFinished && !preds.find((p) => p.matchId === m.id),
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
        predictions={preds}
        onSave={handleSave}
        onDelete={handleDelete}
        userId={userId!}
        teams={teams}
      />
    </div>
  )
}
