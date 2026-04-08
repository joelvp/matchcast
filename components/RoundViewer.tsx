'use client'

import { useState } from 'react'
import { MatchCard } from './MatchCard'
import { getCurrentRound } from '../domain/rounds'
import type { Match } from '../domain/types'

type TeamInfo = { shortName: string; shieldUrl?: string }

type Props = {
  matches: Match[]
  teams: Record<number, TeamInfo>
}

export function RoundViewer({ matches, teams }: Props) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)

  const [activeRound, setActiveRound] = useState<number>(() =>
    rounds.length > 0 ? getCurrentRound(rounds, matches) : rounds[0],
  )

  const roundMatches = matches.filter((m) => m.round === activeRound)

  return (
    <div className="space-y-6">
      {/* Round tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {rounds.map((round) => {
          const isActive = round === activeRound
          const isCurrent = round === getCurrentRound(rounds, matches)
          const isFinished = matches.filter((m) => m.round === round).every((m) => m.isFinished)

          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={`rounded-full px-6 py-2 text-xs font-bold tracking-widest whitespace-nowrap uppercase transition-all active:scale-[0.97] ${
                isActive
                  ? 'bg-primary text-on-primary shadow-md'
                  : isCurrent
                    ? 'border-primary/60 text-primary border'
                    : isFinished
                      ? 'border-outline-variant/30 text-on-surface-variant border opacity-50'
                      : 'border-outline-variant/30 text-on-surface-variant border'
              }`}
            >
              J{round}
            </button>
          )
        })}
      </div>

      {/* Section label */}
      <div className="flex items-end justify-between">
        <h2 className="font-headline text-3xl font-bold tracking-tighter uppercase">
          Jornada {activeRound}
        </h2>
        <span className="text-on-surface-variant text-xs font-bold tracking-widest uppercase">
          {roundMatches.every((m) => m.isFinished) ? 'Finalizada' : 'Próximos'}
        </span>
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {roundMatches.map((match) => (
          <MatchCard key={match.id} match={match} teams={teams} />
        ))}
      </div>
    </div>
  )
}
