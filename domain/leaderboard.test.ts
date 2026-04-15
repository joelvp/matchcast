import { describe, expect, it } from 'vitest'
import { calculateLeaderboard, scorePrediction } from './leaderboard'
import type { Match, Prediction, User } from './types'

// --- scorePrediction ---

describe('scorePrediction', () => {
  it('returns 5 points for exact result', () => {
    expect(scorePrediction({ home: 3, away: 1 }, { home: 3, away: 1 })).toBe(5)
  })

  it('returns 2 points for correct 1X2', () => {
    expect(scorePrediction({ home: 2, away: 0 }, { home: 1, away: 0 })).toBe(2)
  })

  it('returns 0 points for wrong prediction', () => {
    expect(scorePrediction({ home: 0, away: 1 }, { home: 2, away: 0 })).toBe(0)
  })

  it('returns 2 points for draw predicted with different score', () => {
    expect(scorePrediction({ home: 0, away: 0 }, { home: 1, away: 1 })).toBe(2)
  })

  it('returns 0 points for away win predicted as home win', () => {
    expect(scorePrediction({ home: 2, away: 0 }, { home: 0, away: 1 })).toBe(0)
  })

  it('returns 0 points for draw predicted as home win', () => {
    expect(scorePrediction({ home: 1, away: 0 }, { home: 2, away: 2 })).toBe(0)
  })
})

// --- calculateLeaderboard ---

const makeMatch = (id: number, homeGoals: number, awayGoals: number): Match => ({
  id,
  round: 5,
  matchDate: '2026-04-11',
  homeTeamId: 1,
  awayTeamId: 2,
  homeGoals,
  awayGoals,
  isFinished: true,
  isLive: false,
})

const makePrediction = (
  userId: string,
  matchId: number,
  homeGoals: number,
  awayGoals: number,
): Prediction => ({ userId, matchId, homeGoals, awayGoals })

const users: User[] = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
]

describe('calculateLeaderboard', () => {
  it('scores exact prediction as 5 points', () => {
    const matches = [makeMatch(1, 2, 1)]
    const predictions = [makePrediction('u1', 1, 2, 1)]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].totalPoints).toBe(5)
  })

  it('scores correct 1X2 as 2 points', () => {
    const matches = [makeMatch(1, 3, 0)]
    const predictions = [makePrediction('u1', 1, 1, 0)]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].totalPoints).toBe(2)
  })

  it('scores wrong prediction as 0 points', () => {
    const matches = [makeMatch(1, 2, 0)]
    const predictions = [makePrediction('u1', 1, 0, 1)]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].totalPoints).toBe(0)
  })

  it('aggregates points across multiple matches', () => {
    const matches = [makeMatch(1, 2, 1), makeMatch(2, 0, 0)]
    const predictions = [
      makePrediction('u1', 1, 2, 1), // 5pts exact
      makePrediction('u1', 2, 1, 1), // 2pts correct draw
    ]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].totalPoints).toBe(7)
  })

  it('ranks users by total points descending', () => {
    const matches = [makeMatch(1, 2, 0)]
    const predictions = [
      makePrediction('u1', 1, 2, 0), // 5pts
      makePrediction('u2', 1, 0, 1), // 0pts
    ]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].userName).toBe('Alice')
    expect(result[1].userName).toBe('Bob')
  })

  it('ignores predictions for unfinished matches (scores 0 pts)', () => {
    const unfinished: Match = {
      ...makeMatch(1, 0, 0),
      isFinished: false,
      homeGoals: null,
      awayGoals: null,
    }
    const predictions = [makePrediction('u1', 1, 1, 0)]

    const result = calculateLeaderboard(predictions, [unfinished], users)
    expect(result.every((e) => e.totalPoints === 0)).toBe(true)
  })

  it('includes breakdown per match', () => {
    const matches = [makeMatch(1, 2, 1)]
    const predictions = [makePrediction('u1', 1, 2, 1)]

    const result = calculateLeaderboard(predictions, matches, users)
    expect(result[0].breakdown).toEqual([{ matchId: 1, points: 5 }])
  })
})
