import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import { AuthProvider } from '@/components/AuthProvider'
import HeaderMenu from '@/components/HeaderMenu'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
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
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="bg-surface text-on-surface flex min-h-full flex-col">
        <AuthProvider>
          <header className="bg-surface sticky top-0 z-50 flex items-center justify-between px-6 py-4">
            <span className="font-headline text-primary-container text-2xl font-black tracking-tighter">
              QUINIELA DHB
            </span>
            <HeaderMenu />
          </header>
          <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 pb-24">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}
