import { describe, expect, it } from 'vitest'
import { calculateInitialStandings, calculateProjectedStandings } from './standings'
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

const makeMatch = (
  id: number,
  homeTeamId: number,
  awayTeamId: number,
  overrides: Partial<Match> = {},
): Match => ({
  id,
  round: 5,
  matchDate: '2026-04-11',
  homeTeamId,
  awayTeamId,
  homeGoals: null,
  awayGoals: null,
  isFinished: false,
  ...overrides,
})

const makeFinishedMatch = (
  id: number,
  homeTeamId: number,
  awayTeamId: number,
  homeGoals: number,
  awayGoals: number,
): Match => makeMatch(id, homeTeamId, awayTeamId, { homeGoals, awayGoals, isFinished: true })

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

  it('uses real result when match is finished and no prediction exists', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeFinishedMatch(1, 1, 2, 2, 0)]

    const result = calculateProjectedStandings(standings, [], matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(home.points).toBe(3)
    expect(away.points).toBe(0)
  })

  it('uses prediction over real result when match is finished and prediction exists', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    // Real result: home wins 2-0
    const matches = [makeFinishedMatch(1, 1, 2, 2, 0)]
    // User predicted: away wins 0-1
    const predictions = [makePrediction(1, 0, 1)]

    const result = calculateProjectedStandings(standings, predictions, matches)
    const home = result.find((s) => s.teamId === 1)!
    const away = result.find((s) => s.teamId === 2)!

    expect(away.points).toBe(3)
    expect(home.points).toBe(0)
  })

  it('skips pending matches without a prediction', () => {
    const standings = [makeTeam(1), makeTeam(2)]
    const matches = [makeMatch(1, 1, 2)] // pending, no prediction

    const result = calculateProjectedStandings(standings, [], matches)
    expect(result.every((s) => s.points === 0)).toBe(true)
  })
})

describe('calculateInitialStandings', () => {
  it('undoes a home win result', () => {
    const standings = [
      makeTeam(1, { points: 3, played: 1, won: 1, goalsFor: 2, goalsAgainst: 0 }),
      makeTeam(2, { points: 0, played: 1, lost: 1, goalsFor: 0, goalsAgainst: 2 }),
    ]
    const finishedMatches = [makeFinishedMatch(1, 1, 2, 2, 0)]

    const result = calculateInitialStandings(standings, finishedMatches)
    const team1 = result.find((s) => s.teamId === 1)!
    const team2 = result.find((s) => s.teamId === 2)!

    expect(team1.points).toBe(0)
    expect(team1.played).toBe(0)
    expect(team1.won).toBe(0)
    expect(team2.points).toBe(0)
    expect(team2.played).toBe(0)
    expect(team2.lost).toBe(0)
  })

  it('undoes a draw result', () => {
    const standings = [
      makeTeam(1, { points: 1, played: 1, drawn: 1, goalsFor: 1, goalsAgainst: 1 }),
      makeTeam(2, { points: 1, played: 1, drawn: 1, goalsFor: 1, goalsAgainst: 1 }),
    ]
    const finishedMatches = [makeFinishedMatch(1, 1, 2, 1, 1)]

    const result = calculateInitialStandings(standings, finishedMatches)
    expect(result.every((s) => s.points === 0 && s.played === 0)).toBe(true)
  })

  it('is the inverse of calculateProjectedStandings for real results', () => {
    const initial = [makeTeam(1, { points: 5 }), makeTeam(2, { points: 3 })]
    const match = makeFinishedMatch(1, 1, 2, 2, 1)

    const withResult = calculateProjectedStandings(initial, [], [match])
    const restored = calculateInitialStandings(withResult, [match])

    expect(restored.find((s) => s.teamId === 1)!.points).toBe(5)
    expect(restored.find((s) => s.teamId === 2)!.points).toBe(3)
  })
})
