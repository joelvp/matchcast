'use client'

import { useEffect, useState } from 'react'
import { PredictionForm } from '../../components/PredictionForm'
import type { Match, Prediction } from '../../domain/types'

export default function PredictPage() {
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('matchcast_user_id') : null,
  )
  const [userName, setUserName] = useState<string>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('matchcast_user_name') ?? '') : '',
  )
  const [nameInput, setNameInput] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)
      const [matchesRes, predictionsRes] = await Promise.all([
        fetch('/api/matches'),
        fetch(`/api/predictions?userId=${userId}`),
      ])
      const [matchesData, predictionsData] = await Promise.all([
        matchesRes.json(),
        predictionsRes.json(),
      ])
      setMatches(matchesData)
      setPredictions(predictionsData)
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
      <div className="mx-auto max-w-sm space-y-4 pt-12 text-center">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">¿Cómo te llamas?</h1>
        <p className="text-sm text-zinc-500">Usaremos tu nombre para el marcador.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            placeholder="Tu nombre"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            onClick={handleRegister}
            disabled={!nameInput.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Cargando...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Tus predicciones</h1>
        <span className="text-sm text-zinc-500">{userName}</span>
      </div>
      <PredictionForm
        matches={matches}
        predictions={predictions}
        onSave={handleSave}
        userId={userId}
      />
    </div>
  )
}
