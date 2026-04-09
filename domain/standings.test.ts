import { describe, expect, it } from 'vitest'
import { calculateProjectedStandings } from './standings'
import type { Match, Prediction, TeamStanding } from './types'

const makeTeam = (teamId: number, overrides: Partial<TeamStanding> = {}): TeamStanding => ({
  teamId,
  name: `Team ${teamId}`,
  shortName: `T${teamId}`,
  points: 0,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  ...overrides,
})

const makeMatch = (id: number, homeTeamId: number, awayTeamId: number): Match => ({
  id,
  round: 5,
  matchDate: '2026-04-11',
  homeTeamId,
  awayTeamId,
  homeGoals: null,
  awayGoals: null,
  isFinished: false,
})

const makePrediction = (matchId: number, homeGoals: number, awayGoals: number): Prediction => ({
  userId: 'user-1',
  matchId,
  homeGoals,
  awayGoals,
})

describe('calculateProjectedStandings', () => {
  it('applies +3pts to home team on home win', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)]
    const predictions = [makePrediction(1, 2, 0)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(home.points).toBe(3)
    expect(home.won).toBe(1)
    expect(away.points).toBe(0)
    expect(away.lost).toBe(1)
  })

  it('applies +3pts to away team on away win', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)]
    const predictions = [makePrediction(1, 0, 1)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(away.points).toBe(3)
    expect(away.won).toBe(1)
    expect(home.points).toBe(0)
    expect(home.lost).toBe(1)
  })

  it('applies +1pt to both teams on draw', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)]
    const predictions = [makePrediction(1, 1, 1)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(home.points).toBe(1)
    expect(home.drawn).toBe(1)
    expect(away.points).toBe(1)
    expect(away.drawn).toBe(1)
  })

  it('tracks goals correctly', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)]
    const predictions = [makePrediction(1, 3, 1)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(home.goalsFor).toBe(3)
    expect(home.goalsAgainst).toBe(1)
    expect(away.goalsFor).toBe(1)
    expect(away.goalsAgainst).toBe(3)
  })

  it('sorts by points, then goal difference, then goals scored', () => {
    const standings = [
      makeTeam(1, { points: 10, goalsFor: 10, goalsAgainst: 5 }),
      makeTeam(2, { points: 10, goalsFor: 8, goalsAgainst: 3 }),
      makeTeam(3, { points: 10, goalsFor: 8, goalsAgainst: 4 }),
    ]

    const result = calculateProjectedStandings(standings, [], [])

    // All 10pts. GD: T1=+5, T2=+5, T3=+4 → T3 last
    // T1 and T2 tied on GD, T1 has more goals scored
    expect(result[0].teamId).toBe(1)
    expect(result[1].teamId).toBe(2)
    expect(result[2].teamId).toBe(3)
  })

  it('ignores predictions for unknown matches', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)]
    const predictions = [makePrediction(999, 3, 0)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    expect(result.every((s) => s.points === 0)).toBe(true)
  })
})
