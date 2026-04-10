'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/infrastructure/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import type { Match } from '@/domain/types'

type User = { id: string; name: string }
type Section = 'users' | 'predictions' | 'results' | 'sync'

const ADMIN_ELEVATION_KEY = 'admin_elevated'

function isElevated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_ELEVATION_KEY) === 'true'
  } catch {
    return false
  }
}

function setElevated() {
  sessionStorage.setItem(ADMIN_ELEVATION_KEY, 'true')
}

function clearElevated() {
  sessionStorage.removeItem(ADMIN_ELEVATION_KEY)
}

export default function AdminPage() {
  const { userId, loading: authLoading } = useAuth()
  const router = useRouter()
  const isAdminUser = userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID

  const [elevated, setElevatedState] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinLoading, setPinLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('users')

  // Data
  const [users, setUsers] = useState<User[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Record<number, string>>({})
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

  // Edit predictions
  type PredictionInput = { matchId: number; home: string; away: string }
  const [editUserId, setEditUserId] = useState('')
  const [editRound, setEditRound] = useState<number>(5)
  const [editPreds, setEditPreds] = useState<PredictionInput[]>([])
  const [editLoaded, setEditLoaded] = useState(false)
  const [editResult, setEditResult] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Fake results
  const [resultMatchId, setResultMatchId] = useState<number | ''>('')
  const [resultHome, setResultHome] = useState('')
  const [resultAway, setResultAway] = useState('')
  const [resultFinished, setResultFinished] = useState(true)
  const [resultResult, setResultResult] = useState<string | null>(null)

  // Sync
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)

  // Restore elevation from sessionStorage on mount, clear on unmount
  useEffect(() => {
    if (isElevated()) setElevatedState(true)
    return () => clearElevated()
  }, [])

  const loadData = useCallback(async (token: string) => {
    const [usersRes, matchesRes, teamsRes] = await Promise.all([
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/matches'),
      fetch('/api/teams'),
    ])
    const [usersData, matchesData, teamsData] = await Promise.all([
      usersRes.json(),
      matchesRes.json(),
      teamsRes.json(),
    ])
    setUsers(usersData)
    setMatches((matchesData as Match[]).filter((m) => m.round >= 5))
    setTeams(
      Object.fromEntries(
        (teamsData as { id: number; shortName: string }[]).map((t) => [t.id, t.shortName]),
      ),
    )
    setDataLoaded(true)
  }, [])

  // Load data once elevated
  useEffect(() => {
    if (!elevated || dataLoaded) return
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) loadData(session.access_token)
    })
  }, [elevated, dataLoaded, loadData])

  async function getToken(): Promise<string | null> {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession()
    return session?.access_token ?? null
  }

  async function adminFetch(url: string, options: RequestInit = {}) {
    const token = await getToken()
    return fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    })
  }

  async function handlePinSubmit() {
    if (!pin) return
    setPinError(null)
    setPinLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) {
        setPinError('PIN incorrecto.')
        return
      }
      setElevated()
      setElevatedState(true)
      setPin('')
    } finally {
      setPinLoading(false)
    }
  }

  function handleExitAdmin() {
    clearElevated()
    router.push('/')
  }

  async function handleResetPassword() {
    if (!resetUsername.trim() || !resetPassword) return
    setResetResult(null)
    const res = await adminFetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: resetUsername.trim(), newPassword: resetPassword }),
    })
    const data = await res.json()
    setResetResult(
      res.ok
        ? `✓ Contraseña de "${(data as { username: string }).username}" actualizada.`
        : `✗ ${(data as { error: string }).error}`,
    )
    if (res.ok) {
      setResetUsername('')
      setResetPassword('')
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserId || !confirmDelete) return
    setDeleteResult(null)
    const res = await adminFetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: deleteUserId }),
    })
    const data = await res.json()
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId))
      setDeleteResult('✓ Usuario eliminado.')
      setDeleteUserId('')
      setConfirmDelete(false)
    } else {
      setDeleteResult(`✗ ${(data as { error: string }).error}`)
    }
  }

  async function handleLoadPredictions() {
    if (!editUserId) return
    setEditResult(null)
    setEditLoaded(false)
    const roundMatches = matches.filter((m) => m.round === editRound)
    const res = await adminFetch(`/api/admin/predictions?userId=${editUserId}&round=${editRound}`)
    const data = (await res.json()) as { matchId: number; homeGoals: number; awayGoals: number }[]
    const predMap = Object.fromEntries(data.map((p) => [p.matchId, p]))
    setEditPreds(
      roundMatches.map((m) => ({
        matchId: m.id,
        home: predMap[m.id] !== undefined ? String(predMap[m.id].homeGoals) : '',
        away: predMap[m.id] !== undefined ? String(predMap[m.id].awayGoals) : '',
      })),
    )
    setEditLoaded(true)
  }

  async function handleSaveAllPredictions() {
    if (!editUserId) return
    setEditSaving(true)
    setEditResult(null)
    try {
      for (const p of editPreds) {
        if (p.home === '' || p.away === '') continue
        await adminFetch('/api/admin/predictions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editUserId,
            matchId: p.matchId,
            homeGoals: Number(p.home),
            awayGoals: Number(p.away),
          }),
        })
      }
      setEditResult('✓ Predicciones guardadas.')
    } catch {
      setEditResult('✗ Error al guardar.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeletePredictions() {
    if (!predUserId) return
    setPredResult(null)
    const res = await adminFetch('/api/admin/predictions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: predUserId, round: predRound }),
    })
    const data = await res.json()
    setPredResult(
      res.ok
        ? `✓ Predicciones de J${predRound} eliminadas.`
        : `✗ ${(data as { error: string }).error}`,
    )
  }

  async function handleFakeResult() {
    if (resultMatchId === '' || resultHome === '' || resultAway === '') return
    setResultResult(null)
    const res = await adminFetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: resultMatchId,
        homeGoals: Number(resultHome),
        awayGoals: Number(resultAway),
        isFinished: resultFinished,
      }),
    })
    const data = await res.json()
    setResultResult(res.ok ? '✓ Resultado guardado.' : `✗ ${(data as { error: string }).error}`)
  }

  async function handleSync() {
    setSyncResult(null)
    setSyncLoading(true)
    try {
      const res = await adminFetch('/api/admin/sync', { method: 'POST' })
      const data = await res.json()
      setSyncResult(res.ok ? '✓ Sync completado.' : `✗ ${(data as { error: string }).error}`)
    } finally {
      setSyncLoading(false)
    }
  }

  const rounds = [...new Set(matches.map((m) => m.round))].sort()
  const selectedMatch = matches.find((m) => m.id === resultMatchId)

  // Loading auth
  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="font-headline text-primary-container text-4xl font-black">•••</div>
      </div>
    )
  }

  // Not the admin user
  if (!isAdminUser) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-3">
        <span className="material-symbols-outlined text-on-surface-variant text-4xl">lock</span>
        <p className="text-on-surface-variant text-sm">Acceso restringido.</p>
      </div>
    )
  }

  // PIN prompt
  if (!elevated) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6">
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">Admin</h1>
        <div className="w-full max-w-xs space-y-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            placeholder="PIN"
            autoComplete="current-password"
            className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
          />
          {pinError && <p className="text-secondary text-sm font-medium">{pinError}</p>}
          <button
            onClick={handlePinSubmit}
            disabled={!pin || pinLoading}
            className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
          >
            {pinLoading ? '…' : 'Entrar'}
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
    { key: 'sync', label: 'Sync', icon: 'sync' },
  ]

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">Admin</h1>
        <button
          onClick={handleExitAdmin}
          className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors"
        >
          Volver a la app
        </button>
      </div>

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
        <div className="space-y-6">
          {/* Edit predictions */}
          <div className="bg-surface-container-low space-y-3 rounded-xl p-4">
            <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
              Editar predicciones
            </h2>
            <select
              value={editUserId}
              onChange={(e) => {
                setEditUserId(e.target.value)
                setEditLoaded(false)
                setEditResult(null)
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
            <select
              value={editRound}
              onChange={(e) => {
                setEditRound(Number(e.target.value))
                setEditLoaded(false)
                setEditResult(null)
              }}
              className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
            >
              {rounds.map((r) => (
                <option key={r} value={r}>
                  Jornada {r}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadPredictions}
              disabled={!editUserId}
              className="font-headline bg-surface-container-high text-on-surface w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
            >
              Cargar
            </button>
            {editLoaded && (
              <div className="space-y-2">
                {editPreds.map((p) => {
                  const m = matches.find((m) => m.id === p.matchId)!
                  return (
                    <div key={p.matchId} className="flex items-center gap-2">
                      <span className="text-on-surface-variant min-w-0 flex-1 truncate text-xs">
                        {teams[m.homeTeamId] ?? `#${m.homeTeamId}`} vs{' '}
                        {teams[m.awayTeamId] ?? `#${m.awayTeamId}`}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={p.home}
                        onChange={(e) =>
                          setEditPreds((prev) =>
                            prev.map((x) =>
                              x.matchId === p.matchId ? { ...x, home: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="–"
                        className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-14 rounded-lg border-none p-2 text-center text-base focus:ring-2 focus:outline-none"
                      />
                      <span className="text-on-surface-variant text-xs">–</span>
                      <input
                        type="number"
                        min={0}
                        value={p.away}
                        onChange={(e) =>
                          setEditPreds((prev) =>
                            prev.map((x) =>
                              x.matchId === p.matchId ? { ...x, away: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="–"
                        className="font-body bg-surface-container-high text-on-surface focus:ring-primary-container w-14 rounded-lg border-none p-2 text-center text-base focus:ring-2 focus:outline-none"
                      />
                    </div>
                  )
                })}
                {editResult && (
                  <p
                    className={`text-sm font-medium ${editResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
                  >
                    {editResult}
                  </p>
                )}
                <button
                  onClick={handleSaveAllPredictions}
                  disabled={editSaving}
                  className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
                >
                  {editSaving ? '…' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          {/* Delete predictions */}
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
                      {teams[m.homeTeamId] ?? `#${m.homeTeamId}`} vs{' '}
                      {teams[m.awayTeamId] ?? `#${m.awayTeamId}`}
                      {m.isFinished ? ` (${m.homeGoals}-${m.awayGoals})` : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {selectedMatch && (
            <p className="text-on-surface-variant text-xs">
              Local: {teams[selectedMatch.homeTeamId] ?? `#${selectedMatch.homeTeamId}`} —
              Visitante: {teams[selectedMatch.awayTeamId] ?? `#${selectedMatch.awayTeamId}`}
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

      {/* Sync section */}
      {activeSection === 'sync' && (
        <div className="bg-surface-container-low space-y-4 rounded-xl p-4">
          <h2 className="font-headline text-sm font-bold tracking-widest uppercase">
            Sincronizar resultados
          </h2>
          <p className="text-on-surface-variant text-sm">
            Lanza el sync manual de resultados desde resultadoshockey.isquad.es. Equivale al sync
            automático del domingo.
          </p>
          {syncResult && (
            <p
              className={`text-sm font-medium ${syncResult.startsWith('✓') ? 'text-primary' : 'text-secondary'}`}
            >
              {syncResult}
            </p>
          )}
          <button
            onClick={handleSync}
            disabled={syncLoading}
            className="font-headline bg-primary-container text-on-primary-fixed flex w-full items-center justify-center gap-2 rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">sync</span>
            {syncLoading ? 'Sincronizando…' : 'Sync ahora'}
          </button>
        </div>
      )}
    </div>
  )
}
