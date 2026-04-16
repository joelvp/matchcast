import { createClient } from 'npm:@supabase/supabase-js@2'
import { parse as parseHtml } from 'npm:node-html-parser'

const COMP_ID = '8205'
const TOTAL_ROUNDS = 8

const matchUrl = (round: number) =>
  `https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=${COMP_ID}&jornada=${round}&id_ambito=0&id_superficie=1`

function normalize(name: string): string {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
  isLive: boolean
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

    const isLive = !isFinished && homeGoals !== null

    const dateTimeCell = row.querySelectorAll('td')[2]
    const timeText = dateTimeCell?.querySelector('div:not(.negrita)')?.text.trim() ?? ''
    const dateText = dateTimeCell?.querySelector('div.negrita')?.text.trim() ?? ''
    const matchDate = parseDateTime(dateText, timeText)

    results.push({
      round,
      homeTeamNorm,
      awayTeamNorm,
      homeGoals,
      awayGoals,
      isFinished,
      isLive,
      matchDate,
    })
  }

  return results
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceKey)

  const force = new URL(req.url).searchParams.get('force') === 'true'

  if (!force) {
    const { data: hasMatches } = await supabase.rpc('has_matches_to_sync')
    if (!hasMatches) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

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
          is_live: m.isLive,
        },
        { onConflict: 'round,home_team_id,away_team_id' },
      )
    }
  }

  await supabase.rpc('refresh_standings')

  // Invalidate Next.js cache after sync
  const appUrl = Deno.env.get('APP_URL')
  const revalidateSecret = Deno.env.get('REVALIDATE_SECRET')
  const bypassSecret = Deno.env.get('VERCEL_BYPASS_SECRET')
  if (appUrl && revalidateSecret) {
    const headers: Record<string, string> = { 'x-revalidate-secret': revalidateSecret }
    if (bypassSecret) headers['x-vercel-protection-bypass'] = bypassSecret
    await fetch(`${appUrl}/api/revalidate`, { method: 'POST', headers }).catch(() => {
      /* non-fatal */
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
