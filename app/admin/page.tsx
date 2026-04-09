'use client'

import { useState } from 'react'
import { supabaseBrowser } from '../../infrastructure/supabase/client'
import type { Match } from '../../domain/types'

type AdminSession = { accessToken: string }
type User = { id: string; name: string }

type Section = 'users' | 'predictions' | 'results'

export default function AdminPage() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('users')

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  // Reset password
  const [resetUsername, setResetUsername] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)

  // Delete user
  const [deleteUserId, setDeleteUserId] = useState('')
  const [deleteResult, setDeleteResult] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Delete predictions
  const [predUserId, setPredUserId] = useState('')
  const [predRound, setPredRound] = useState<number>(5)
  const [predResult, setPredResult] = useState<string | null>(null)

  // Fake results
  const [resultMatchId, setResultMatchId] = useState<number | ''>('')
  const [resultHome, setResultHome] = useState('')
  const [resultAway, setResultAway] = useState('')
  const [resultFinished, setResultFinished] = useState(true)
  const [resultResult, setResultResult] = useState<string | null>(null)

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession!.accessToken}`,
    }
  }

  async function handleLogin() {
    if (!password) return
    setLoginError(null)
    setLoginLoading(true)
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: 'admin@matchcast.local',
        password,
      })
      if (error || !data.session) {
        setLoginError('Contraseña incorrecta.')
        return
      }
      const session = { accessToken: data.session.access_token }
      setAdminSession(session)

      // Load users and matches
      const [usersRes, matchesRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }),
        fetch('/api/matches'),
      ])
      const [usersData, matchesData] = await Promise.all([usersRes.json(), matchesRes.json()])
      setUsers(usersData)
      setMatches((matchesData as Match[]).filter((m) => m.round >= 5))
      setDataLoaded(true)
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!resetUsername.trim() || !resetPassword) return
    setResetResult(null)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ username: resetUsername.trim(), newPassword: resetPassword }),
    })
    const data = await res.json()
    setResetResult(res.ok ? `✓ Contraseña de "${data.username}" actualizada.` : `✗ ${data.error}`)
    if (res.ok) {
      setResetUsername('')
      setResetPassword('')
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserId || !confirmDelete) return
    setDeleteResult(null)
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ userId: deleteUserId }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
      setDeleteResult('✓ Usuario eliminado.')
      setDeleteUserId('')
      setConfirmDelete(false)
    } else {
      setDeleteResult(`✗ ${data.error}`)
    }
  }

  async function handleDeletePredictions() {
    if (!predUserId) return
    setPredResult(null)
    const res = await fetch('/api/admin/predictions', {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({ userId: predUserId, round: predRound }),
    })
    const data = await res.json()
    setPredResult(res.ok ? `✓ Predicciones de J${predRound} eliminadas.` : `✗ ${data.error}`)
  }

  async function handleFakeResult() {
    if (resultMatchId === '' || resultHome === '' || resultAway === '') return
    setResultResult(null)
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        matchId: resultMatchId,
        homeGoals: Number(resultHome),
        awayGoals: Number(resultAway),
        isFinished: resultFinished,
      }),
    })
    const data = await res.json()
    setResultResult(res.ok ? '✓ Resultado guardado.' : `✗ ${data.error}`)
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const selectedMatch = matches.find((m) => m.id === resultMatchId)

  if (!adminSession) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6">
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">Admin</h1>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Contraseña"
            autoComplete="current-password"
            className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          />
          {loginError && <p className="text-secondary text-sm font-medium">{loginError}</p>}
          <button
            onClick={handleLogin}
            disabled={!password || loginLoading}
            className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
          >
            {loginLoading ? '…' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  if (!dataLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="font-headline text-primary-container text-4xl font-black">•••</div>
      </div>
    )
  }

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: 'users', label: 'Usuarios', icon: 'manage_accounts' },
    { key: 'predictions', label: 'Predicciones', icon: 'delete_sweep' },
    { key: 'results', label: 'Resultados', icon: 'edit_note' },
  ]

  return (
    <div className="space-y-6 pt-2">
      <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">Admin</h1>

      {/* Section tabs */}
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`font-headline flex flex-1 flex-col items-center gap-1 rounded-xl py-3 text-[10px] font-bold tracking-widest uppercase transition-all ${
              activeSection === s.key
                ? 'bg-primary-container text-on-primary-fixed'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Users section */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          {/* Reset password */}
          <div className="bg-surface-container-low space-y-3 rounded-xl p-4">
            <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
              Resetear contraseña
            </h2>
            <select
              value={resetUsername}
              onChange={(e) => setResetUsername(e.target.value)}
              className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            >
              <option value="">Selecciona usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Nueva contraseña"
              autoComplete="new-password"
              className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            />
            {resetResult && (
              <p
                className={`text-sm font-medium ${resetResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
              >
                {resetResult}
              </p>
            )}
            <button
              onClick={handleResetPassword}
              disabled={!resetUsername || !resetPassword}
              className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
            >
              Resetear
            </button>
          </div>

          {/* Delete user */}
          <div className="bg-surface-container-low space-y-3 rounded-xl p-4">
            <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
              Eliminar usuario
            </h2>
            <select
              value={deleteUserId}
              onChange={(e) => {
                setDeleteUserId(e.target.value)
                setConfirmDelete(false)
                setDeleteResult(null)
              }}
              className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            >
              <option value="">Selecciona usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {deleteUserId && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="accent-secondary h-4 w-4"
                />
                <span className="text-on-surface-variant">
                  Confirmo que quiero eliminar este usuario y todas sus predicciones
                </span>
              </label>
            )}
            {deleteResult && (
              <p
                className={`text-sm font-medium ${deleteResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
              >
                {deleteResult}
              </p>
            )}
            <button
              onClick={handleDeleteUser}
              disabled={!deleteUserId || !confirmDelete}
              className="font-headline bg-error/80 text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Predictions section */}
      {activeSection === 'predictions' && (
        <div className="bg-surface-container-low space-y-3 rounded-xl p-4">
          <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
            Borrar predicciones por jornada
          </h2>
          <select
            value={predUserId}
            onChange={(e) => setPredUserId(e.target.value)}
            className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          >
            <option value="">Selecciona usuario</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select
            value={predRound}
            onChange={(e) => setPredRound(Number(e.target.value))}
            className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          >
            {rounds.map((r) => (
              <option key={r} value={r}>
                Jornada {r}
              </option>
            ))}
          </select>
          {predResult && (
            <p
              className={`text-sm font-medium ${predResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
            >
              {predResult}
            </p>
          )}
          <button
            onClick={handleDeletePredictions}
            disabled={!predUserId}
            className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
          >
            Borrar predicciones
          </button>
        </div>
      )}

      {/* Results section */}
      {activeSection === 'results' && (
        <div className="bg-surface-container-low space-y-3 rounded-xl p-4">
          <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
            Fakear resultado
          </h2>
          <select
            value={resultMatchId}
            onChange={(e) => setResultMatchId(Number(e.target.value))}
            className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          >
            <option value="">Selecciona partido</option>
            {rounds.map((r) => (
              <optgroup key={r} label={`Jornada ${r}`}>
                {matches
                  .filter((m) => m.round === r)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.homeTeamId} vs {m.awayTeamId}
                      {m.isFinished ? ` (${m.homeGoals}-${m.awayGoals})` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {selectedMatch && (
            <p className="text-on-surface-variant text-xs">
              Local: #{selectedMatch.homeTeamId} — Visitante: #{selectedMatch.awayTeamId}
            </p>
          )}

          <div className="flex gap-3">
            <input
              type="number"
              min={0}
              value={resultHome}
              onChange={(e) => setResultHome(e.target.value)}
              placeholder="Local"
              className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            />
            <input
              type="number"
              min={0}
              value={resultAway}
              onChange={(e) => setResultAway(e.target.value)}
              placeholder="Visitante"
              className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={resultFinished}
              onChange={(e) => setResultFinished(e.target.checked)}
              className="accent-primary h-4 w-4"
            />
            <span className="text-on-surface-variant">Marcar como finalizado</span>
          </label>

          {resultResult && (
            <p
              className={`text-sm font-medium ${resultResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
            >
              {resultResult}
            </p>
          )}
          <button
            onClick={handleFakeResult}
            disabled={resultMatchId === '' || resultHome === '' || resultAway === ''}
            className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
          >
            Guardar resultado
          </button>
        </div>
      )}
    </div>
  )
}
