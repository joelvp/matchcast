import type { Match, Prediction, TeamStanding } from './types'

function getOutcome(homeGoals: number, awayGoals: number) {
  if (homeGoals > awayGoals) return 'home'
  if (awayGoals > homeGoals) return 'away'
  return 'draw'
}

function applyResult(
  standings: Map<number, TeamStanding>,
  homeTeamId: number,
  awayTeamId: number,
  homeGoals: number,
  awayGoals: number,
) {
  const home = standings.get(homeTeamId)
  const away = standings.get(awayTeamId)
  if (!home || !away) return

  const outcome = getOutcome(homeGoals, awayGoals)
  home.played++
  home.goalsFor += homeGoals
  home.goalsAgainst += awayGoals
  away.played++
  away.goalsFor += awayGoals
  away.goalsAgainst += homeGoals

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

function undoResult(
  standings: Map<number, TeamStanding>,
  homeTeamId: number,
  awayTeamId: number,
  homeGoals: number,
  awayGoals: number,
) {
  const home = standings.get(homeTeamId)
  const away = standings.get(awayTeamId)
  if (!home || !away) return

  const outcome = getOutcome(homeGoals, awayGoals)
  home.played--
  home.goalsFor -= homeGoals
  home.goalsAgainst -= awayGoals
  away.played--
  away.goalsFor -= awayGoals
  away.goalsAgainst -= homeGoals

  if (outcome === 'home') {
    home.won--
    home.points -= 3
    away.lost--
  } else if (outcome === 'away') {
    away.won--
    away.points -= 3
    home.lost--
  } else {
    home.drawn--
    home.points -= 1
    away.drawn--
    away.points -= 1
  }
}

function sortStandings(standings: TeamStanding[]): TeamStanding[] {
  return [...standings].sort((a, b) => {
    const pointsDiff = b.points - a.points
    if (pointsDiff !== 0) return pointsDiff

    const gdA = a.goalsFor - a.goalsAgainst
    const gdB = b.goalsFor - b.goalsAgainst
    const gdDiff = gdB - gdA
    if (gdDiff !== 0) return gdDiff

    return b.goalsFor - a.goalsFor
  })
}

/**
 * Reconstructs pre-phase standings by undoing all finished match results.
 * Used as the base for round-by-round projection calculations.
 */
export function calculateInitialStandings(
  standings: TeamStanding[],
  finishedMatches: Match[],
): TeamStanding[] {
  const result = new Map(standings.map((s) => [s.teamId, { ...s }]))

  for (const match of finishedMatches) {
    if (match.homeGoals === null || match.awayGoals === null) continue
    undoResult(result, match.homeTeamId, match.awayTeamId, match.homeGoals, match.awayGoals)
  }

  return Array.from(result.values())
}

/**
 * Calculates projected standings starting from a base (pre-phase) state.
 *
 * Two modes:
 * - Default (no realRounds): prediction takes priority; real result used as fallback for
 *   finished/live matches. Used for "Resultados reales" tab (called with empty predictions).
 * - Smart predictions (realRounds provided): rounds in the set use real results; all other
 *   rounds use the user's predictions only (skip if no prediction). Used for "Tus predicciones"
 *   tab — pass fully-finished rounds excluding the selected round so the selected round always
 *   shows the user's predictions, even after it ends.
 */
export function calculateProjectedStandings(
  baseStandings: TeamStanding[],
  predictions: Prediction[],
  matches: Match[],
  realRounds?: Set<number>,
): TeamStanding[] {
  const predictionByMatchId = new Map(predictions.map((p) => [p.matchId, p]))
  const standings = new Map(baseStandings.map((s) => [s.teamId, { ...s }]))

  for (const match of matches) {
    const prediction = predictionByMatchId.get(match.id)

    if (realRounds !== undefined) {
      if (realRounds.has(match.round)) {
        if (match.homeGoals !== null && match.awayGoals !== null) {
          applyResult(
            standings,
            match.homeTeamId,
            match.awayTeamId,
            match.homeGoals,
            match.awayGoals,
          )
        }
      } else if (prediction) {
        applyResult(
          standings,
          match.homeTeamId,
          match.awayTeamId,
          prediction.homeGoals,
          prediction.awayGoals,
        )
      }
      // no prediction → skip
    } else {
      if (prediction) {
        applyResult(
          standings,
          match.homeTeamId,
          match.awayTeamId,
          prediction.homeGoals,
          prediction.awayGoals,
        )
      } else if (
        (match.isFinished || match.isLive) &&
        match.homeGoals !== null &&
        match.awayGoals !== null
      ) {
        applyResult(standings, match.homeTeamId, match.awayTeamId, match.homeGoals, match.awayGoals)
      }
    }
  }

  return sortStandings(Array.from(standings.values()))
}
