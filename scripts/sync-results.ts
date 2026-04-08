#!/usr/bin/env tsx
/**
 * Sync match results and standings from resultadoshockey.isquad.es
 *
 * Usage:
 *   npm run sync
 *
 * Reads credentials from .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */

import { createClient } from '@supabase/supabase-js'
import { parse as parseHtml } from 'node-html-parser'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function loadEnvLocal(): Record<string, string> {
  try {
    return Object.fromEntries(
      fs
        .readFileSync('.env.local', 'utf-8')
        .split('\n')
        .filter((line) => line.includes('=') && !line.startsWith('#'))
        .map((line) => {
          const idx = line.indexOf('=')
          return [
            line.slice(0, idx).trim(),
            line
              .slice(idx + 1)
              .replace(/^["']|["']$/g, '')
              .trim(),
          ]
        }),
    )
  } catch {
    return {}
  }
}

const env = { ...loadEnvLocal(), ...process.env }

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMP_ID = '8205'
const TOTAL_ROUNDS = 8

const matchUrl = (round: number) =>
  `https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=${COMP_ID}&jornada=${round}&id_ambito=0&id_superficie=1`

const STANDINGS_URL = `https://resultadoshockey.isquad.es/clasificacion.php?seleccion=0&id=${COMP_ID}&id_ambito=0&id_territorial=9999&id_superficie=1&iframe=0`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Uppercase + strip accents + collapse spaces — for fuzzy team name matching */
function normalize(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extract the first integer found in a string */
function firstInt(text: string): number {
  const m = text.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

/** Parse DD/MM/YYYY + HH:MM → ISO timestamp with Spain timezone (CEST = +02:00) */
function parseDateTime(dateText: string, timeText: string): string {
  const d = dateText.match(/(\d{2})[/-](\d{2})[/-](\d{4})/)
  const t = timeText.match(/(\d{2}):(\d{2})/)
  if (!d) return '2026-01-01T00:00:00+02:00'
  const date = `${d[3]}-${d[2]}-${d[1]}`
  const time = t ? `${t[1]}:${t[2]}` : '00:00'
  return `${date}T${time}:00+02:00`
}

// ---------------------------------------------------------------------------
// Scrapers
// ---------------------------------------------------------------------------

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
  // Confirmed structure: table.clasificacion tbody tr, 11 cells per row
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🏑 Matchcast sync\n')

  const { data: teams, error: teamsErr } = await supabase.from('teams').select('id, name')
  if (teamsErr) throw teamsErr

  const teamMap = new Map<string, number>(teams.map((t) => [normalize(t.name), t.id]))

  // --- Matches (rounds 1-8) ---
  console.log('Syncing matches...')
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    process.stdout.write(`  J${round}... `)
    const matches = await scrapeRound(round)
    let ok = 0

    for (const m of matches) {
      const homeTeamId = teamMap.get(m.homeTeamNorm)
      const awayTeamId = teamMap.get(m.awayTeamNorm)

      if (!homeTeamId || !awayTeamId) {
        console.warn(`\n    ⚠  Team not found: "${m.homeTeamNorm}" vs "${m.awayTeamNorm}"`)
        continue
      }

      const { error } = await supabase.from('matches').upsert(
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

      if (error) console.error(`\n    ❌ ${error.message}`)
      else ok++
    }

    console.log(`${ok} matches`)
  }

  // --- Standings ---
  console.log('\nSyncing standings...')
  const standings = await scrapeStandings()

  for (const s of standings) {
    const teamId = teamMap.get(s.teamNorm)
    if (!teamId) {
      console.warn(`  ⚠  Team not found: "${s.teamNorm}"`)
      continue
    }

    const { error } = await supabase.from('standings').upsert(
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

    if (error) console.error(`  ❌ ${s.teamNorm}: ${error.message}`)
    else console.log(`  ✅ ${s.teamNorm}: ${s.points}pts`)
  }

  console.log('\n✨ Done!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
