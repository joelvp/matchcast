import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\.',
              message: 'Use @/ path alias instead of relative imports',
            },
          ],
        },
      ],
      // False positive in App Router: the rule targets Pages Router's _document.js
      '@next/next/no-page-custom-font': 'off',
      // Reading localStorage on mount to avoid SSR/client hydration mismatch is the
      // established Next.js pattern. useSyncExternalStore is the React 18 alternative
      // but adds unnecessary complexity for a one-time mount read.
      'react-hooks/set-state-in-effect': 'off',
      // Using plain <img> for small fixed-size icons (team shields) is intentional —
      // Next.js <Image> conflicts with Tailwind preflight's `height: auto` on img elements.
      '@next/next/no-img-element': 'off',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
