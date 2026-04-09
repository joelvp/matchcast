import { createClient } from 'npm:@supabase/supabase-js@2'
import { parse as parseHtml } from 'npm:node-html-parser'

const COMP_ID = '8205'
const TOTAL_ROUNDS = 8

const matchUrl = (round: number) =>
  `https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=${COMP_ID}&jornada=${round}&id_ambito=0&id_superficie=1`

const STANDINGS_URL = `https://resultadoshockey.isquad.es/clasificacion.php?seleccion=0&id=${COMP_ID}&id_ambito=0&id_territorial=9999&id_superficie=1&iframe=0`

function normalize(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function firstInt(text: string): number {
  const m = text.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

function parseDateTime(dateText: string, timeText: string): string {
  const d = dateText.match(/(\d{2})[/-](\d{2})[/-](\d{4})/)
  const t = timeText.match(/(\d{2}):(\d{2})/)
  if (!d) return '2026-01-01T00:00:00+02:00'
  const date = `${d[3]}-${d[2]}-${d[1]}`
  const time = t ? `${t[1]}:${t[2]}` : '00:00'
  return `${date}T${time}:00+02:00`
}

type ScrapedMatch = {
  round: number
  homeTeamNorm: string
  awayTeamNorm: string
  homeGoals: number | null
  awayGoals: number | null
  isFinished: boolean
  matchDate: string
}

async function scrapeRound(round: number): Promise<ScrapedMatch[]> {
  const html = await fetch(matchUrl(round)).then((r) => r.text())
  const root = parseHtml(html)
  const rows = root.querySelectorAll('tr.partido')
  const results: ScrapedMatch[] = []

  for (const row of rows) {
    const estado = (row.getAttribute('data-estado') ?? '').trim()
    const isFinished = estado === 'Finalizado'

    const teamAnchors = row.querySelectorAll('div.nombres-equipos a')
    if (teamAnchors.length < 2) continue

    const homeTeamNorm = normalize(teamAnchors[0].text)
    const awayTeamNorm = normalize(teamAnchors[1].text)
    if (!homeTeamNorm || !awayTeamNorm) continue

    let homeGoals: number | null = null
    let awayGoals: number | null = null

    if (isFinished) {
      const local = row.querySelector('span.local')
      const visitante = row.querySelector('span.visitante')
      if (local && visitante) {
        const h = parseInt(local.text.trim(), 10)
        const a = parseInt(visitante.text.trim(), 10)
        if (!isNaN(h) && !isNaN(a)) {
          homeGoals = h
          awayGoals = a
        }
      }
    }

    const dateTimeCell = row.querySelectorAll('td')[2]
    const timeText = dateTimeCell?.querySelector('div:not(.negrita)')?.text.trim() ?? ''
    const dateText = dateTimeCell?.querySelector('div.negrita')?.text.trim() ?? ''
    const matchDate = parseDateTime(dateText, timeText)

    results.push({ round, homeTeamNorm, awayTeamNorm, homeGoals, awayGoals, isFinished, matchDate })
  }

  return results
}

type ScrapedStanding = {
  teamNorm: string
  points: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

async function scrapeStandings(): Promise<ScrapedStanding[]> {
  const html = await fetch(STANDINGS_URL).then((r) => r.text())
  const root = parseHtml(html)
  const rows = root.querySelectorAll('table.clasificacion tbody tr')
  const results: ScrapedStanding[] = []

  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 10) continue

    const teamLink = cells[1]?.querySelector('a')
    if (!teamLink) continue

    const teamNorm = normalize(teamLink.text)
    if (!teamNorm) continue

    results.push({
      teamNorm,
      points: firstInt(cells[3].text),
      played: firstInt(cells[4].text),
      won: firstInt(cells[5].text),
      drawn: firstInt(cells[6].text),
      lost: firstInt(cells[7].text),
      goalsFor: firstInt(cells[8].text),
      goalsAgainst: firstInt(cells[9].text),
    })
  }

  return results
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const appUrl = Deno.env.get('APP_URL')!
  const adminKey = Deno.env.get('ADMIN_KEY')!

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name')
  if (teamsErr) return new Response(JSON.stringify({ error: teamsErr.message }), { status: 500 })

  const teamMap = new Map<string, number>(
    (teams ?? []).map((t: { id: number; name: string }) => [normalize(t.name), t.id]),
  )

  // Sync matches
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    const matches = await scrapeRound(round)

    for (const m of matches) {
      const homeTeamId = teamMap.get(m.homeTeamNorm)
      const awayTeamId = teamMap.get(m.awayTeamNorm)
      if (!homeTeamId || !awayTeamId) continue

      await supabase.from('matches').upsert(
        {
          round: m.round,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: m.matchDate,
          home_goals: m.homeGoals,
          away_goals: m.awayGoals,
          is_finished: m.isFinished,
        },
        { onConflict: 'round,home_team_id,away_team_id' },
      )
    }
  }

  // Sync standings
  const standings = await scrapeStandings()

  for (const s of standings) {
    const teamId = teamMap.get(s.teamNorm)
    if (!teamId) continue

    await supabase.from('standings').upsert(
      {
        team_id: teamId,
        points: s.points,
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goals_for: s.goalsFor,
        goals_against: s.goalsAgainst,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id' },
    )
  }

  // Invalidate home page cache
  await fetch(`${appUrl}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: adminKey }),
  })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
