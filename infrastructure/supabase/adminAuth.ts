import { supabaseServer } from './server'

export async function verifyAdminSession(authHeader: string | null): Promise<boolean> {
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return false

  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(token)

  if (error || !user) return false
  return user.email === 'admin@matchcast.local'
}
