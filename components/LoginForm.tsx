'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/infrastructure/supabase/auth'

type Mode = 'login' | 'register'

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !password) return
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const user = await signIn(name.trim(), password)
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, name: name.trim() }),
        })
        router.push('/predict')
      } else {
        const authUser = await signUp(name.trim(), password)
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: authUser.id, name: name.trim() }),
        })
        if (!res.ok) {
          setError('Error al crear el usuario')
          return
        }
        router.push('/predict')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const translated = msg.includes('at least 6 characters')
        ? 'La contraseña debe tener al menos 6 caracteres.'
        : msg.includes('Invalid login credentials')
          ? 'Nombre o contraseña incorrectos.'
          : msg.includes('User already registered')
            ? 'Ya existe un usuario con ese nombre.'
            : msg
      setError(translated)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 text-center">
      <div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter uppercase">
          {mode === 'login' ? (
            <>
              Bienvenido
              <br />
              <span className="text-primary">de vuelta</span>
            </>
          ) : (
            <>
              Únete a la
              <br />
              <span className="text-primary">quiniela</span>
            </>
          )}
        </h1>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          autoComplete="username"
          className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Contraseña"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="font-body bg-surface-container-high text-on-surface placeholder:text-on-surface-variant focus:ring-primary-container w-full rounded-xl border-none px-4 py-3 text-base focus:ring-2 focus:outline-none"
        />

        {error && <p className="text-secondary text-sm font-medium">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !password || loading}
          className="font-headline bg-primary-container text-on-primary-fixed w-full rounded-xl py-3 font-extrabold tracking-widest uppercase transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40"
        >
          {loading ? '…' : mode === 'login' ? 'Entrar' : 'Registrarse'}
        </button>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError(null)
          }}
          className="text-on-surface-variant w-full pt-1 text-sm hover:underline"
        >
          {mode === 'login' ? '¿Primera vez? Regístrate' : '¿Ya tienes cuenta? Entra'}
        </button>
      </div>
    </div>
  )
}
