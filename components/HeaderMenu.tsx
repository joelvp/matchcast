'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from './AuthProvider'

const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID

export default function HeaderMenu({ version }: { version: string }) {
  const { userId, userName, signOut } = useAuth()
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

  const isAdmin = userId === ADMIN_USER_ID

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
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="text-on-surface hover:bg-surface-container border-outline-variant/20 flex w-full items-center gap-2 border-b px-4 py-3 text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              Modo admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="text-on-surface hover:bg-surface-container flex w-full items-center gap-2 px-4 py-3 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
          <div className="border-outline-variant/20 border-t px-4 py-2 text-right">
            <span className="text-on-surface-variant text-[10px]">v{version}</span>
          </div>
        </div>
      )}
    </div>
  )
}
