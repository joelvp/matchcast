import type { User } from '../../domain/types'
import { supabaseServer } from './server'

export async function getOrCreateUser(id: string, name: string): Promise<User> {
  const { data, error } = await supabaseServer
    .from('users')
    .upsert({ id, name }, { onConflict: 'id' })
    .select('id, name')
    .single()

  if (error) throw new Error(error.message)

  return { id: data.id, name: data.name }
}

export async function getAllUsers(): Promise<User[]> {
  const { data, error } = await supabaseServer.from('users').select('id, name')

  if (error) throw new Error(error.message)

  return data.map((row) => ({ id: row.id, name: row.name }))
}

export async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return []

  const { data, error } = await supabaseServer.from('users').select('id, name').in('id', ids)

  if (error) throw new Error(error.message)

  return data.map((row) => ({ id: row.id, name: row.name }))
}
