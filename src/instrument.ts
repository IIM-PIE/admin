import * as Sentry from '@sentry/react'

// Doit être importé en TOUTE PREMIÈRE ligne de main.tsx (avant React) pour capter
// les erreurs au plus tôt. Init uniquement si VITE_SENTRY_DSN est fourni au build
// (build-arg, compilé dans le bundle) → no-op en local si absent.
// Le DSN d'un front est public par nature — c'est normal et sans risque.
const dsn = (import.meta.env as Record<string, string | undefined>).VITE_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Traces de perf désactivées par défaut (activables plus tard).
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}
