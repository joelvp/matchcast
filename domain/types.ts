export type Score = {
  home: number
  away: number
}

export type TeamStanding = {
  teamId: number
  name: string
  shortName: string
  points: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

export type Match = {
  id: number
  round: number
  matchDate: string
  homeTeamId: number
  awayTeamId: number
  homeGoals: number | null
  awayGoals: number | null
  isFinished: boolean
}

export type Prediction = {
  userId: string
  matchId: number
  homeGoals: number
  awayGoals: number
}

export type User = {
  id: string
  name: string
}

export type LeaderboardEntry = {
  userId: string
  userName: string
  totalPoints: number
  breakdown: { matchId: number; points: number }[]
}
