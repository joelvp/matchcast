import type { NextRequest } from 'next/server'

export function verifyAdminSession(request: NextRequest): boolean {
  const cookie = request.cookies.get('admin_session')
  return !!process.env.ADMIN_KEY && cookie?.value === process.env.ADMIN_KEY
}
