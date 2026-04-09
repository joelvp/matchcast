'use client'

import { useState } from 'react'
import { supabaseBrowser } from '../../infrastructure/supabase/client'

type AdminSession = {
  accessToken: string
}

export default function AdminPage() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [username, setUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

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

      setAdminSession({ accessToken: data.session.access_token })
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleReset() {
    if (!username.trim() || !newPassword || !adminSession) return
    setResetResult(null)
    setResetLoading(true)

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession.accessToken}`,
        },
        body: JSON.stringify({ username: username.trim(), newPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setResetResult(`Error: ${data.error}`)
      } else {
        setResetResult(`Contraseña de "${data.username}" actualizada.`)
        setUsername('')
        setNewPassword('')
      }
    } finally {
      setResetLoading(false)
    }
  }

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

  return (
    <div className="space-y-8 pt-4">
      <h1 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">
        Admin — Resetear contraseña
      </h1>
      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre del usuario"
          className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
          placeholder="Nueva contraseña"
          autoComplete="new-password"
          className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
        />
        {resetResult && (
          <p
            className={`text-sm font-medium ${resetResult.startsWith('Error') ? 'text-secondary' : 'text-primary'}`}
          >
            {resetResult}
          </p>
        )}
        <button
          onClick={handleReset}
          disabled={!username.trim() || !newPassword || resetLoading}
          className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase disabled:opacity-40"
        >
          {resetLoading ? '…' : 'Resetear'}
        </button>
      </div>
    </div>
  )
}
