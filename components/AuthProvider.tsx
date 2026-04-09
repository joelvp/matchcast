'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/infrastructure/supabase/client'
import { signOut as authSignOut } from '@/infrastructure/supabase/auth'

type AuthContextType = {
  userId: string | null
  userName: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  userId: null,
  userName: null,
  loading: true,
  signOut: async () => {},
})

type User = { id: string; name: string } | null

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read session from cookie on mount — no network call
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: (session.user.user_metadata?.name as string) ?? '',
        })
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: (session.user.user_metadata?.name as string) ?? '',
        })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        loading,
        signOut: authSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
