import type { LeaderboardEntry, Match, Prediction, Score, User } from './types'

function getOutcome(score: Score): 'home' | 'draw' | 'away' {
  if (score.home > score.away) return 'home'
  if (score.away > score.home) return 'away'
  return 'draw'
}

export function scorePrediction(predicted: Score, actual: Score): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return 5
  if (getOutcome(predicted) === getOutcome(actual)) return 2
  return 0
}

export function calculateLeaderboard(
  allPredictions: Prediction[],
  realResults: Match[],
  users: User[],
): LeaderboardEntry[] {
  const finishedMatches = new Map(
    realResults
      .filter((m) => m.isFinished && m.homeGoals !== null && m.awayGoals !== null)
      .map((m) => [m.id, m]),
  )

  const userById = new Map(users.map((u) => [u.id, u]))
  const entriesById = new Map<string, LeaderboardEntry>()

  for (const prediction of allPredictions) {
    const match = finishedMatches.get(prediction.matchId)
    if (!match) continue

    const points = scorePrediction(
      { home: prediction.homeGoals, away: prediction.awayGoals },
      { home: match.homeGoals!, away: match.awayGoals! },
    )

    const existing = entriesById.get(prediction.userId)
    if (existing) {
      existing.totalPoints += points
      existing.breakdown.push({ matchId: prediction.matchId, points })
    } else {
      const user = userById.get(prediction.userId)
      entriesById.set(prediction.userId, {
        userId: prediction.userId,
        userName: user?.name ?? 'Unknown',
        totalPoints: points,
        breakdown: [{ matchId: prediction.matchId, points }],
      })
    }
  }

  for (const user of users) {
    if (!entriesById.has(user.id)) {
      entriesById.set(user.id, {
        userId: user.id,
        userName: user.name,
        totalPoints: 0,
        breakdown: [],
      })
    }
  }

  return Array.from(entriesById.values()).sort((a, b) => b.totalPoints - a.totalPoints)
}
