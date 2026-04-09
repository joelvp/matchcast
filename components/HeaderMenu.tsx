'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

export default function HeaderMenu() {
  const { userName, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    router.push('/predict')
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="text-primary material-symbols-outlined">
        settings
      </button>

      {open && (
        <div className="bg-surface border-outline-variant/20 absolute right-0 mt-2 w-48 rounded-xl border shadow-lg">
          {userName && (
            <div className="border-outline-variant/20 border-b px-4 py-3">
              <p className="text-on-surface-variant text-xs">Conectado como</p>
              <p className="text-on-surface truncate text-sm font-bold">{userName}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="text-on-surface hover:bg-surface-container flex w-full items-center gap-2 rounded-b-xl px-4 py-3 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
