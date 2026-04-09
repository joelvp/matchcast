# Deployment

## Branch strategy

```
main   → production (auto-deploy to Vercel prod)
dev    → development (auto-deploy to Vercel preview)
```

- All work branches off `dev`
- Open PRs into `dev`
- Merge `dev` → `main` to release to production

## Environments

|          | Dev                               | Prod                                  |
| -------- | --------------------------------- | ------------------------------------- |
| Frontend | Vercel preview URL                | `matchcast.vercel.app`                |
| Database | Supabase project: `matchcast-dev` | Supabase project: `matchcast-prod`    |
| pg_cron  | Disabled — trigger manually       | Enabled — runs every Sunday 22:00 CET |

Each environment has its own Supabase project with separate credentials. Vercel environment variables are configured per-environment.

## Environment variables

### `.env.local` (Next.js)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # Server only — never exposed to client
```

### Supabase Edge Function secrets

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### GitHub Actions secrets

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — needed by `next build` in CI.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `dev` and PRs to `main`/`dev`:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run format:check`
4. `npm run test`
5. `npm run build`

## Edge Function: sync-results

Path: `supabase/functions/sync-results/index.ts`

**What it does:**

1. Fetch each round page from resultadoshockey.isquad.es
2. Parse HTML to extract finished match scores
3. Update `matches` with `home_goals`, `away_goals`, `is_finished = true`
4. Recalculate `standings` by applying new results

**URLs to scrape:**

```
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=5&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=6&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=7&id_ambito=0&id_superficie=1
https://resultadoshockey.isquad.es/competicion.php?seleccion=0&id=8205&jornada=8&id_ambito=0&id_superficie=1
```

**Score format in HTML:** column `MARCADOR` — pending: `-`, finished: `X - Y`

## pg_cron schedule (prod only)

```sql
SELECT cron.schedule(
  'sync-match-results',
  '0 21 * * 0',  -- Sundays 21:00 UTC = 22:00 CET (summer: change to 20:00 UTC)
  $$SELECT net.http_post(
    url := 'https://<PROJECT-REF>.supabase.co/functions/v1/sync-results',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  )$$
);
```

## Useful commands

```bash
# Local dev
npm run dev

# Run tests
npm run test

# Deploy Edge Function
npx supabase functions deploy sync-results

# Trigger sync manually (dev)
curl -X POST https://<PROJECT-REF>.supabase.co/functions/v1/sync-results \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

## Admin notes

No admin panel needed — real results sync automatically via Edge Function every Sunday. If the scraper fails, update `matches.home_goals / away_goals / is_finished` directly in the Supabase Dashboard.
