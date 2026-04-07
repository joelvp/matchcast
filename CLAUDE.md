@AGENTS.md

# matchcast

League prediction app for a field hockey competition (División de Honor B Masculina, Segunda Fase Grupo B), designed to be configurable for any league or sport.

Users predict match results for the remaining rounds. The app shows projected standings based on each user's predictions and a leaderboard ranking users by accuracy once real results are in.

**League results URL:** https://resultadoshockey.isquad.es/competicion.php?id=8205&id_ambito=0&id_superficie=1&id_territorial=9999&seleccion=0

## Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Framework          | Next.js 16 (App Router) + TypeScript                  |
| Styles             | Tailwind CSS + shadcn/ui                              |
| Database / Backend | Supabase (PostgreSQL + Edge Functions)                |
| Deployment         | Vercel                                                |
| Auto-sync          | Supabase Edge Function + pg_cron (every Sunday night) |

## Roadmap

Current implementation status and pending work live in [`PLAN.md`](./PLAN.md).

@.claude/architecture.md
@.claude/database.md
@.claude/deployment.md
