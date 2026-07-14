import { Check, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ORDER_STATUS_STEP,
  STEP_LABELS,
  type OrderStatus,
} from '@/services/orders.service'

/**
 * Timeline B2B des 8 étapes d'une commande Strada Auto.
 *
 * Contrairement à `reservation-workflow-timeline.tsx` qui décrit la
 * partie B2C côté client (réservation → caution → livraison), ce composant
 * est spécifique à Order (pipeline séquestre B2B) et reflète les 8 étapes
 * de la doc fonctionnelle Selim (mémoire projet).
 *
 * L'état de chaque étape est calculé à partir du `OrderStatus` courant :
 *   - étape strictement < étape courante → done
 *   - étape == étape courante → active
 *   - étape > étape courante → todo
 *   - status == cancelled → toutes les étapes ≥ étape d'annulation → cancelled
 */
interface OrderWorkflowTimelineProps {
  status: OrderStatus
  compact?: boolean
}

const STEPS: number[] = [1, 2, 3, 4, 5, 6, 7, 8]

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

        return (
          <li
            key={step}
            className="relative flex flex-1 flex-col items-center text-center"
          >
            <div className="flex w-full items-center">
              <span
                className={cn(
                  'z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold shrink-0',
                  state === 'done' &&
                    'border-emerald-500 bg-emerald-500 text-white',
                  state === 'active' &&
                    'border-primary text-primary ring-4 ring-primary/15',
                  state === 'todo' && 'border-muted text-muted-foreground',
                  state === 'cancelled' &&
                    'border-destructive text-destructive',
                )}
                aria-label={`Étape ${step}`}
              >
                {state === 'done' ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : state === 'cancelled' ? (
                  <XCircle className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  step
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'h-0.5 flex-1',
                    state === 'done' ? 'bg-emerald-500' : 'bg-muted',
                  )}
                  aria-hidden
                />
              )}
            </div>
            {!compact && (
              <div className="mt-2 max-w-[120px] text-[11px] leading-tight">
                <div
                  className={cn(
                    'font-medium',
                    state === 'active' && 'text-primary',
                    state === 'cancelled' && 'text-destructive',
                    (state === 'todo' || state === 'cancelled') &&
                      'text-muted-foreground',
                  )}
                >
                  {STEP_LABELS[step]}
                </div>
              </div>
            )}
            {!compact && <Circle className="sr-only" />}
          </li>
        )
      })}
    </ol>
  )
}
