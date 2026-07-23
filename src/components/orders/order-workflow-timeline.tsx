import {
  Check,
  ClipboardCheck,
  FileClock,
  Flag,
  HandCoins,
  Landmark,
  Package,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ORDER_STATUS_STEP,
  STEP_LABELS,
  type OrderStatus,
} from '@/services/orders.service'

/**
 * Timeline des 9 étapes d'une commande Strada Auto — v3 (2026-07-23).
 *
 * Deux changements par rapport à v2 :
 *  - **icônes contextuelles** par étape (HandCoins → FileClock → ShieldCheck
 *    → Send → …) pour donner du signifiant visuel immédiat au-delà du
 *    simple numéro. Demande Bogdan : plus de « tous les ronds se
 *    ressemblent » quand on scanne le stepper.
 *  - **règle visuelle unifiée** stricte :
 *      · étape < étape courante → 🟩 done (fond vert + Check)
 *      · étape == étape courante → 🟦 active (bordure primary + ring
 *        + icône contextuelle bleue)
 *      · étape > étape courante → ⚪ todo (fond neutre, icône grise)
 *      · status == cancelled → 🟥 tout en destructive (XCircle)
 *
 * Aucune logique métier ici — seulement du rendu à partir de
 * `Order.status`. Le back gère toutes les transitions (auto-transition
 * step 2 → 3 dès 3 docs validés, rollback auto step 3 → 2 sur reject
 * d'une pièce obligatoire).
 */
interface OrderWorkflowTimelineProps {
  status: OrderStatus
  compact?: boolean
}

const STEPS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Icônes contextuelles par étape — utilisées quand l'étape est `active` ou
// `todo`. Quand `done`, on affiche le Check ✓ pour signifier "validé".
const STEP_ICON: Record<number, LucideIcon> = {
  1: HandCoins, // Acompte encaissé
  2: FileClock, // En attente des pièces client
  3: ShieldCheck, // Pièces validées + virement reçu
  4: Send, // Virement Strada émis vers le pro
  5: Landmark, // Virement reçu par le pro
  6: ClipboardCheck, // Documents de vente préparés
  7: Package, // Véhicule prêt pour enlèvement
  8: Truck, // En route vers la France
  9: Flag, // Livré au client
}

export function OrderWorkflowTimeline({
  status,
  compact = false,
}: OrderWorkflowTimelineProps) {
  const currentStep = ORDER_STATUS_STEP[status]
  const isCancelled = status === 'cancelled'

  return (
    <ol
      className={cn(
        'flex w-full items-start justify-between gap-2',
        compact ? 'px-1' : 'px-2 py-3',
      )}
    >
      {STEPS.map((step, idx) => {
        const isLast = idx === STEPS.length - 1
        let state: 'done' | 'active' | 'todo' | 'cancelled' = 'todo'
        if (isCancelled) {
          state = 'cancelled'
        } else if (step < currentStep) {
          state = 'done'
        } else if (step === currentStep) {
          state = 'active'
        }

        const Icon = STEP_ICON[step]

        return (
          <li
            key={step}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            <div className="flex w-full items-center">
              <span
                className={cn(
                  'z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold shrink-0 transition-colors',
                  state === 'done' &&
                    'border-emerald-500 bg-emerald-500 text-white',
                  state === 'active' &&
                    'border-primary text-primary ring-4 ring-primary/15',
                  state === 'todo' &&
                    'border-muted text-muted-foreground/70',
                  state === 'cancelled' &&
                    'border-destructive text-destructive',
                )}
                aria-label={`Étape ${step} — ${STEP_LABELS[step]}`}
                title={STEP_LABELS[step]}
              >
                {state === 'done' ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : state === 'cancelled' ? (
                  <XCircle className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={state === 'active' ? 2.4 : 2}
                  />
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'h-0.5 flex-1 transition-colors',
                    state === 'done' ? 'bg-emerald-500' : 'bg-muted',
                  )}
                  aria-hidden
                />
              )}
            </div>
            {!compact && (
              <div className="mt-2 max-w-[120px] text-[11px] leading-tight">
                <div className="text-[10px] font-mono text-muted-foreground/60 mb-0.5">
                  {step.toString().padStart(2, '0')}
                </div>
                <div
                  className={cn(
                    'font-medium',
                    state === 'done' && 'text-emerald-700 dark:text-emerald-400',
                    state === 'active' && 'text-primary',
                    state === 'cancelled' && 'text-destructive',
                    state === 'todo' && 'text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[step]}
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
