'use client'

import { useEffect, useState } from 'react'
import { PredictionForm } from '../../components/PredictionForm'
import type { Match, Prediction, TeamStanding } from '../../domain/types'

export default function PredictPage() {
  // Lazy init from localStorage — safe in 'use client' components (runs only on client)
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('matchcast_user_id') : null,
  )
  const [userName, setUserName] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('matchcast_user_name') ?? '') : '',
  )
  const [nameInput, setNameInput] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [teams, setTeams] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

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
      setMatches(matchesData)
      setPredictions(predictionsData)
      setTeams(
        Object.fromEntries((standingsData as TeamStanding[]).map((s) => [s.teamId, s.shortName])),
      )
      setLoading(false)
    }

    load()
  }, [userId])

  async function handleRegister() {
    if (!nameInput.trim()) return
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameInput.trim() }),
    })
    if (!res.ok) return
    const user = await res.json()
    localStorage.setItem('matchcast_user_id', user.id)
    localStorage.setItem('matchcast_user_name', user.name)
    setUserId(user.id)
    setUserName(user.name)
  }

  async function handleSave(prediction: Prediction) {
    await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prediction),
    })
    setPredictions((prev) => [...prev.filter((p) => p.matchId !== prediction.matchId), prediction])
  }

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center">
        <div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter uppercase">
            ¿Cómo te
            <br />
            <span className="text-primary">llamas?</span>
          </h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Usaremos tu nombre para el marcador.
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            placeholder="Tu nombre"
            className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          />
          <button
            onClick={handleRegister}
            disabled={!nameInput.trim()}
            className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
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
        userId={userId}
        teams={teams}
      />
    </div>
  )
}
