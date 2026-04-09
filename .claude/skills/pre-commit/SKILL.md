---
name: pre-commit
description: Run the full pre-commit quality check suite before committing code in this Next.js/TypeScript project. Invoke this skill when the user says anything like "pre-commit", "check before commit", "ready to commit", "run checks", "validate my code", "can I commit", "is the code clean", "everything look good?", or when they seem about to run git commit and want assurance first. Run all four checks (TypeScript, ESLint, tests, Prettier format) and report a clear pass/fail summary.
---

# Pre-commit checks

The goal is to catch problems before they reach git — type errors, lint violations, broken tests, and formatting drift. Run all four checks and collect every failure before reporting. Don't stop at the first error; the user wants the full picture so they can fix everything in one go.

## The four checks

Run these in order. Capture stdout+stderr for each.

### 1. TypeScript

```bash
npx tsc --noEmit 2>&1
```

No output = clean. Any output = type errors.

### 2. ESLint

```bash
npm run lint 2>&1
```

Exit code 0 = clean. Warnings and errors both matter — show them.

### 3. Tests

```bash
npm run test 2>&1
```

Show the pass/fail count. Any failing test blocks the commit.

### 4. Format (Prettier)

```bash
npm run format:check 2>&1
```

Lists files that don't match the configured style. If anything fails, the fix is one command: `npm run format`. No manual editing needed — tell the user that.

## Summary report

End every run with a block like this — it's what the user actually reads:

```
## Pre-commit results

✅ TypeScript — no errors
✅ ESLint — no warnings
❌ Tests — 1 failed (see above)
✅ Format — clean

❌ Not safe to commit. Fix the failing tests first.
```

Or when everything passes:

```
## Pre-commit results

✅ TypeScript — no errors
✅ ESLint — no warnings
✅ Tests — 12 passed
✅ Format — clean

✅ Safe to commit.
```

Keep the summary short. The full command output is already visible above it — no need to repeat it. If Prettier fails, add: `Run \`npm run format\` to auto-fix.`
