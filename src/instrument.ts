import * as Sentry from '@sentry/react'

// Doit être importé en TOUTE PREMIÈRE ligne de main.tsx (avant React) pour capter
// les erreurs au plus tôt. Init uniquement si VITE_SENTRY_DSN est fourni au build
// (build-arg, compilé dans le bundle) → no-op en local si absent.
// Le DSN d'un front est public par nature — c'est normal et sans risque.
const env = import.meta.env as Record<string, string | undefined>
const dsn = env.VITE_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // import.meta.env.MODE vaut "production" pour tout `vite build`, y compris
    // celui de preprod : il ne peut pas distinguer les deux environnements.
    // VITE_SENTRY_ENVIRONMENT est fournie en build-arg par la CI selon la branche.
    environment: env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // Traces de perf désactivées par défaut (activables plus tard).
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}
