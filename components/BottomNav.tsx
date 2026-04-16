'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Inicio', href: '/', icon: 'home' },
  { label: 'Quiniela', href: '/predict', icon: 'edit' },
  { label: 'Clasificación', href: '/standings', icon: 'bar_chart' },
  { label: 'Jornada', href: '/my-round', icon: 'sports' },
  { label: 'Ranking', href: '/results', icon: 'emoji_events' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bg-surface-container fixed right-0 bottom-0 left-0 z-50 flex h-16 items-stretch justify-around">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
          >
            <span
              className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-primary-container' : ''}`}
            >
              <span
                className={`material-symbols-outlined text-[22px] leading-none ${isActive ? 'text-on-primary-container' : 'text-on-surface-variant'}`}
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400",
                }}
              >
                {tab.icon}
              </span>
            </span>
            <span
              className={`font-label text-[10px] leading-none font-medium ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
