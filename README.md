# matchcast

League prediction app for field hockey — predict match results,
see projected standings, and compete with teammates on accuracy.

Built with Next.js, Supabase, and Tailwind CSS.

> 🚧 Work in progress

## Setup

```bash
npm install
```

## Agent skills

Custom skills are committed to the repo. Third-party skills are tracked in `skills-lock.json` — reinstall after cloning with:

```bash
npx skills install
```

### Third-party skills

| Skill | Source | Purpose |
|-------|--------|---------|
| `deploy-to-vercel` | vercel-labs/agent-skills | Deploy to Vercel |
| `frontend-design` | anthropics/skills | Production-grade UI components |
| `skill-creator` | anthropics/skills | Create and iterate on new skills |
| `supabase-postgres-best-practices` | supabase/agent-skills | Postgres query and schema best practices |
| `typescript-advanced-types` | wshobson/agents | Advanced TypeScript type patterns |
| `using-superpowers` | obra/superpowers | Discover and use available skills |
| `vercel-react-best-practices` | vercel-labs/agent-skills | Next.js and React performance patterns |
| `web-design-guidelines` | vercel-labs/agent-skills | Accessibility and UI guidelines |

### Custom skills

| Skill | Purpose |
|-------|---------|
| `pre-commit` | Run type check, lint, tests and format check before committing |
