import type { LeaderboardEntry } from '../domain/types'

type Props = {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

function FormBadge({ points }: { points: number }) {
  if (points === 5) {
    return (
      <div className="bg-on-primary flex h-4 w-4 items-center justify-center rounded-sm">
        <span
          className="material-symbols-outlined text-primary-container text-[10px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check
        </span>
      </div>
    )
  }
  if (points === 2) {
    return <div className="bg-secondary/60 h-4 w-4 rounded-sm" />
  }
  return <div className="bg-error-container/70 h-4 w-4 rounded-sm" />
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-16 w-16 text-sm',
    lg: 'h-24 w-24 text-base',
  }

  return (
    <div
      className={`bg-surface-container-highest font-headline flex items-center justify-center rounded-full font-black ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  )
}

export function Leaderboard({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <span
          className="material-symbols-outlined text-on-surface-variant mb-3 block text-4xl"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          emoji_events
        </span>
        <p className="text-on-surface-variant text-sm">
          No hay resultados todavía — vuelve cuando acabe la primera jornada.
        </p>
      </div>
    )
  }

  const [first, second, third, ...rest] = entries

  return (
    <div className="space-y-8">
      {/* Podium */}
      {entries.length >= 2 && (
        <div className="relative flex items-end justify-center gap-4 rounded-xl pt-12 pb-4">
          {/* Subtle gradient background */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(180deg, rgba(244, 255, 198, 0.04) 0%, transparent 100%)',
            }}
          />

          {/* 2nd place */}
          {second && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <div className="border-outline-variant rounded-full border-2 p-0.5">
                  <Avatar name={second.userName} size="md" />
                </div>
                <div className="border-surface bg-outline-variant text-on-surface absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold">
                  2
                </div>
              </div>
              <span className="font-headline text-on-surface-variant mt-2 text-sm font-semibold">
                {second.userName.split(' ')[0]}
              </span>
              <span className="font-headline text-on-surface text-lg font-bold">
                {second.totalPoints}
              </span>
            </div>
          )}

          {/* 1st place */}
          {first && (
            <div className="relative z-10 -mt-8 flex flex-col items-center gap-1">
              <span
                className="material-symbols-outlined text-tertiary absolute -top-10 animate-bounce text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                workspace_premium
              </span>
              <div className="relative">
                <div
                  className="border-primary-container rounded-full border-4 p-0.5"
                  style={{ boxShadow: '0 0 20px rgba(209, 252, 0, 0.3)' }}
                >
                  <Avatar name={first.userName} size="lg" />
                </div>
                <div className="border-surface bg-primary-container text-on-primary-container absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-4 text-sm font-black">
                  1
                </div>
              </div>
              <span className="font-headline text-primary mt-2 text-base font-bold">
                {first.userName.split(' ')[0]}
              </span>
              <span className="font-headline text-on-surface text-2xl font-black">
                {first.totalPoints}
              </span>
            </div>
          )}

          {/* 3rd place */}
          {third && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <div className="border-secondary-container rounded-full border-2 p-0.5">
                  <Avatar name={third.userName} size="md" />
                </div>
                <div className="border-surface bg-secondary-container text-on-secondary-container absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold">
                  3
                </div>
              </div>
              <span className="font-headline text-on-surface-variant mt-2 text-sm font-semibold">
                {third.userName.split(' ')[0]}
              </span>
              <span className="font-headline text-on-surface text-lg font-bold">
                {third.totalPoints}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ranking list (4th+) */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {/* Header */}
          <div className="text-on-surface-variant/60 grid grid-cols-[40px_1fr_100px_64px] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
            <span>#Pos</span>
            <span>Participante</span>
            <span className="text-center">Forma</span>
            <span className="text-right">Pts</span>
          </div>

          {rest.map((entry, idx) => {
            const pos = idx + 4
            const isCurrentUser = entry.userId === currentUserId
            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-[40px_1fr_100px_64px] items-center rounded-xl border-l-4 px-4 py-4 transition-colors ${
                  isCurrentUser
                    ? 'border-primary bg-primary/5'
                    : 'bg-surface-container-low border-transparent'
                }`}
              >
                <span className="font-headline text-on-surface-variant font-bold">{pos}</span>
                <div className="flex items-center gap-3">
                  <Avatar name={entry.userName} size="sm" />
                  <span className="font-headline text-on-surface truncate font-bold">
                    {entry.userName}
                  </span>
                </div>
                <div className="flex justify-center gap-1">
                  {entry.breakdown.map((b) => (
                    <FormBadge key={b.matchId} points={b.points} />
                  ))}
                </div>
                <span className="font-headline text-on-surface text-right font-bold tabular-nums">
                  {entry.totalPoints}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Top 3 also in list if there are no rest items OR always show full list */}
      {rest.length === 0 && entries.length > 0 && entries.length < 4 && (
        <div className="space-y-3">
          <div className="text-on-surface-variant/60 grid grid-cols-[40px_1fr_100px_64px] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
            <span>#Pos</span>
            <span>Participante</span>
            <span className="text-center">Forma</span>
            <span className="text-right">Pts</span>
          </div>
          {entries.map((entry, idx) => {
            const isCurrentUser = entry.userId === currentUserId
            return (
              <div
                key={entry.userId}
                className={`grid grid-cols-[40px_1fr_100px_64px] items-center rounded-xl border-l-4 px-4 py-4 transition-colors ${
                  isCurrentUser
                    ? 'border-primary bg-primary/5'
                    : 'bg-surface-container-low border-transparent'
                }`}
              >
                <span className="font-headline text-on-surface-variant font-bold">{idx + 1}</span>
                <div className="flex items-center gap-3">
                  <Avatar name={entry.userName} size="sm" />
                  <span className="font-headline text-on-surface truncate font-bold">
                    {entry.userName}
                  </span>
                </div>
                <div className="flex justify-center gap-1">
                  {entry.breakdown.map((b) => (
                    <FormBadge key={b.matchId} points={b.points} />
                  ))}
                </div>
                <span className="font-headline text-on-surface text-right font-bold tabular-nums">
                  {entry.totalPoints}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
