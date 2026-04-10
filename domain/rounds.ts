import type { Match } from './types'

/** Noon (12:00) Madrid time on the first match day of the round — predictions lock here. */
export function getRoundDeadline(roundMatches: Match[]): Date {
  const earliest = roundMatches.reduce(
    (min, m) => (m.matchDate < min ? m.matchDate : min),
    roundMatches[0].matchDate,
  )
  const dateStr = new Date(earliest).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
  return new Date(`${dateStr}T12:00:00+02:00`)
}

/**
 * Returns the Monday 00:00 Madrid time after the last match of a round.
 * The UI stays on a round until this moment, so users can review results
 * all weekend before the app moves on.
 */
export function roundExpiresAt(roundMatches: Match[]): Date {
  const latest = roundMatches.reduce(
    (max, m) => (m.matchDate > max ? m.matchDate : max),
    roundMatches[0].matchDate,
  )
  const madridDate = new Date(latest).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
  // Noon Madrid — stable reference point for getUTCDay()
  const noon = new Date(`${madridDate}T12:00:00+02:00`)
  const dow = noon.getUTCDay() // 0=Sun, 1=Mon … 6=Sat
  const daysToMonday = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow
  const monday = new Date(`${madridDate}T00:00:00+02:00`)
  monday.setUTCDate(monday.getUTCDate() + daysToMonday)
  return monday
}

/** The current active round: first whose Monday expiry hasn't passed, else the last. */
export function getCurrentRound(rounds: number[], matches: Match[]): number {
  const active = rounds.find((r) => {
    const rm = matches.filter((m) => m.round === r)
    return rm.length > 0 && new Date() < roundExpiresAt(rm)
  })
  return active ?? rounds[rounds.length - 1]
}
