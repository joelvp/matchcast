import { supabaseBrowser } from './client'

function toEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@matchcast.local`
}

export async function signUp(name: string, password: string) {
  const { data, error } = await supabaseBrowser.auth.signUp({
    email: toEmail(name),
    password,
    options: { data: { name } },
  })
  if (error) throw error
  return data.user!
}

export async function signIn(name: string, password: string) {
  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email: toEmail(name),
    password,
  })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabaseBrowser.auth.signOut()
}
