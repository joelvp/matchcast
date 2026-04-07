import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'matchcast',
  description: 'Predice los resultados y ve cómo quedaría la clasificación',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <nav className="mx-auto flex max-w-2xl items-center gap-6 px-4 py-3">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              matchcast
            </Link>
            <div className="flex gap-4 text-sm">
              <Link
                href="/predict"
                className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Predecir
              </Link>
              <Link
                href="/standings"
                className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Clasificación
              </Link>
              <Link
                href="/results"
                className="text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Resultados
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
