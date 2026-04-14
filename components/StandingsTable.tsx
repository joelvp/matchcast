'use client'

import { useState } from 'react'
import type { TeamStanding } from '@/domain/types'

type BadgeType = 'live' | 'projection' | 'final' | 'pending' | 'real-pending' | 'real-final'

type Props = {
  standings: TeamStanding[]
  projected?: TeamStanding[]
  title?: string
  subtitle?: string
  badge?: BadgeType
  showBadgeInfo?: boolean
}

const BADGE_CONFIG: Record<
  BadgeType,
  { icon: string; label: string; className: string; pulse?: boolean }
> = {
  live: {
    icon: 'bolt',
    label: 'EN VIVO',
    className: 'bg-secondary/10 text-secondary',
    pulse: true,
  },
  projection: {
    icon: 'auto_awesome',
    label: 'PROYECCIÓN',
    className: 'bg-primary/10 text-primary',
  },
  final: {
    icon: 'emoji_events',
    label: 'DEFINITIVA',
    className: 'bg-tertiary/10 text-tertiary',
  },
  pending: {
    icon: 'pending_actions',
    label: 'SIN PREDICCIONES',
    className: 'bg-surface-container-highest text-on-surface-variant',
  },
  'real-pending': {
    icon: 'schedule',
    label: 'PENDIENTE',
    className: 'bg-surface-container-highest text-on-surface-variant',
  },
  'real-final': {
    icon: 'check_circle',
    label: 'FINALIZADA',
    className: 'bg-primary/10 text-primary',
  },
}

const MODAL_ITEMS: { badge: BadgeType; text: string }[] = [
  {
    badge: 'pending',
    text: 'Aún no has introducido predicciones para esta jornada.',
  },
  {
    badge: 'projection',
    text: 'Ningún partido ha terminado aún. La tabla refleja cómo quedaría todo si tus predicciones se cumplen.',
  },
  {
    badge: 'live',
    text: 'Algunos partidos ya tienen resultado real. La tabla mezcla esos resultados con tus predicciones para los partidos que quedan.',
  },
  {
    badge: 'final',
    text: 'Todos los partidos han terminado. Esta es la clasificación final real de la jornada.',
  },
]

function Badge({ type, onClick }: { type: BadgeType; onClick?: () => void }) {
  const config = BADGE_CONFIG[type]
  const baseClass = `flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold ${config.className}`
  const inner = (
    <>
      <span
        className="material-symbols-outlined text-[12px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {config.icon}
      </span>
      {config.label}
      {onClick && (
        <span
          className="material-symbols-outlined text-[10px] opacity-60"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          info
        </span>
      )}
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${config.pulse ? 'animate-pulse' : ''} cursor-pointer`}
      >
        {inner}
      </button>
    )
  }

  return <span className={`${baseClass} ${config.pulse ? 'animate-pulse' : ''}`}>{inner}</span>
}

export function StandingsTable({
  standings,
  projected,
  title,
  subtitle,
  badge,
  showBadgeInfo,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const rows = projected ?? standings
  const sorted = [...rows].sort((a, b) => {
    const pd = b.points - a.points
    if (pd !== 0) return pd
    const gda = a.goalsFor - a.goalsAgainst
    const gdb = b.goalsFor - b.goalsAgainst
    if (gdb !== gda) return gdb - gda
    return b.goalsFor - a.goalsFor
  })

  return (
    <>
      <div className="bg-surface-container-low overflow-hidden rounded-xl">
        <div className="border-outline-variant/10 bg-surface-container-high/50 flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-headline text-primary text-lg font-bold tracking-widest uppercase">
            {title ?? 'Clasificación'}
          </h2>
          {badge ? (
            <Badge type={badge} onClick={showBadgeInfo ? () => setModalOpen(true) : undefined} />
          ) : subtitle ? (
            <span className="text-on-surface-variant text-[10px] font-medium tracking-tight uppercase">
              {subtitle}
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container/30 text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Eq</th>
                <th className="px-4 py-3 text-center">Pts</th>
                <th className="px-4 py-3 text-center">PJ</th>
                <th className="px-4 py-3 text-center">G</th>
                <th className="px-4 py-3 text-center">E</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">DG</th>
                {projected && <th className="px-4 py-3 text-center">±</th>}
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {sorted.map((team, i) => {
                const currentPos = projected
                  ? standings.findIndex((s) => s.teamId === team.teamId)
                  : i
                const diff = projected ? currentPos - i : null
                const gd = team.goalsFor - team.goalsAgainst
                const isTop = i === 0
                const isBottom = i >= sorted.length - 2
                const isOurs = team.shortName === 'Giner'

                return (
                  <tr
                    key={team.teamId}
                    className={`animate-fade-in-up border-outline-variant/5 border-b ${isTop ? 'bg-primary/5' : isBottom ? 'bg-secondary/5' : isOurs ? 'bg-tertiary/10' : i % 2 === 0 ? 'bg-surface-container/30' : ''}`}
                    style={{ animationDelay: `${i * 40}ms`, opacity: 0 }}
                  >
                    <td className="px-4 py-4">
                      <span
                        className={`font-bold tabular-nums ${isTop ? 'text-primary' : isBottom ? 'text-secondary' : isOurs ? 'text-tertiary' : 'text-on-surface'}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="font-headline text-on-surface px-4 py-4 font-bold">
                      <div className="flex items-center gap-2">
                        {team.shieldUrl && (
                          <img
                            src={team.shieldUrl}
                            alt={team.shortName}
                            className="h-6 w-6 shrink-0 object-contain"
                          />
                        )}
                        {team.shortName}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-4 text-center font-bold tabular-nums ${isTop ? 'text-primary-fixed' : isBottom ? 'text-secondary' : isOurs ? 'text-tertiary' : 'text-on-surface'}`}
                    >
                      {team.points}
                    </td>
                    <td className="text-on-surface-variant px-4 py-4 text-center tabular-nums">
                      {team.played}
                    </td>
                    <td className="px-4 py-4 text-center tabular-nums">{team.won}</td>
                    <td className="px-4 py-4 text-center tabular-nums">{team.drawn}</td>
                    <td className="px-4 py-4 text-center tabular-nums">{team.lost}</td>
                    <td
                      className={`px-4 py-4 text-center tabular-nums ${gd > 0 ? 'text-primary' : gd < 0 ? 'text-secondary' : 'text-on-surface-variant'}`}
                    >
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    {projected && (
                      <td className="px-4 py-4 text-center text-xs">
                        {diff === null || diff === 0 ? (
                          <span className="text-on-surface-variant">—</span>
                        ) : diff > 0 ? (
                          <span className="text-primary font-bold">↑{diff}</span>
                        ) : (
                          <span className="text-secondary font-bold">↓{Math.abs(diff)}</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-headline text-on-surface text-base font-bold">
                ¿Qué estás viendo?
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {MODAL_ITEMS.map(({ badge: itemBadge, text }) => {
                const config = BADGE_CONFIG[itemBadge]
                return (
                  <div key={itemBadge} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.className}`}
                    >
                      <span
                        className="material-symbols-outlined text-[13px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {config.icon}
                      </span>
                    </span>
                    <div>
                      <p className="text-on-surface text-xs font-bold">{config.label}</p>
                      <p className="text-on-surface-variant mt-0.5 text-xs leading-relaxed">
                        {text}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
