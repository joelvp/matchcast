import type { Match, Prediction, TeamStanding } from './types'

function getOutcome(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) return 'home'
  if (awayGoals > homeGoals) return 'away'
  return 'draw'
}

export function calculateProjectedStandings(
  baseStandings: TeamStanding[],
  predictions: Prediction[],
  matches: Match[],
): TeamStanding[] {
  const matchById = new Map(matches.map((m) => [m.id, m]))
  const standings = new Map(
    baseStandings.map((s) => [s.teamId, { ...s }]),
  )

  for (const prediction of predictions) {
    const match = matchById.get(prediction.matchId)
    if (!match) continue

    const home = standings.get(match.homeTeamId)
    const away = standings.get(match.awayTeamId)
    if (!home || !away) continue

    const outcome = getOutcome(prediction.homeGoals, prediction.awayGoals)

    home.played++
    home.goalsFor += prediction.homeGoals
    home.goalsAgainst += prediction.awayGoals

    away.played++
    away.goalsFor += prediction.awayGoals
    away.goalsAgainst += prediction.homeGoals

    if (outcome === 'home') {
      home.won++
      home.points += 3
      away.lost++
    } else if (outcome === 'away') {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      home.points += 1
      away.drawn++
      away.points += 1
    }
  }

  return Array.from(standings.values()).sort((a, b) => {
    const pointsDiff = b.points - a.points
    if (pointsDiff !== 0) return pointsDiff

    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    const gdDiff = gdB - gdA
    if (gdDiff !== 0) return gdDiff

    return b.goalsFor - a.goalsFor
  })
}
