import { useMemo } from 'react'
import { Check, Clock, Circle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Reservation, Vehicle } from '@/types'

/**
 * Timeline visuelle du workflow métier Strada — reflète la doc de
 * référence backend/docs/WORKFLOW_STRADA.md (10 étapes, mais on n'en
 * matérialise que 5 dans la timeline car les autres sont soit
 * évidentes soit non actionnables côté agent).
 *
 * Étapes affichées :
 *   1. Réservation créée              (Reservation existe)
 *   2. Caution payée                  (Payment succeeded via Stripe)
 *   3. Justificatifs client           (docs conversationId)
 *   4. Dossier d'import en cours      (Import existe et in_progress)
 *   5. Livraison                      (Vehicle sold)
 *
 * L'état de chaque étape est calculé à partir de la Reservation et de
 * son Vehicle. Pas de fetch supplémentaire côté composant — le parent
 * doit passer les données déjà agrégées.
 */

type StepState = 'done' | 'active' | 'todo' | 'blocked'

interface StepDef {
  key: string
  label: string
  shortLabel: string
  state: StepState
  hint?: string
  cta?: string
}

interface ReservationWorkflowTimelineProps {
  reservation: Reservation
  vehicle?: Pick<Vehicle, 'id' | 'status'> | null
  compact?: boolean
  /** Callback CTA (optionnel) : le parent décide quoi faire selon l'étape. */
  onCta?: (stepKey: string) => void
}

function computeSteps(
  reservation: Reservation,
  vehicle?: ReservationWorkflowTimelineProps['vehicle'],
): StepDef[] {
  const lastPayment = reservation.payments?.[0]
  const paymentSucceeded = lastPayment?.status === 'succeeded'
  const paymentFailed = lastPayment?.status === 'failed'
  const isConfirmed = reservation.status === 'confirmed'
  const isCancelled = reservation.status === 'cancelled'
  const vehicleSold = vehicle?.status === 'sold'
  const vehicleReserved = vehicle?.status === 'reserved'

  // Étape 1 — Réservation créée (existe toujours si on affiche ce composant)
  const step1: StepDef = {
    key: 'reservation',
    label: 'Réservation créée',
    shortLabel: 'Résa',
    state: 'done',
    hint: `Créée le ${new Date(reservation.createdAt).toLocaleDateString('fr-FR')}`,
  }

  // Étape 2 — Caution payée
  //
  // Le mode manuel a été retiré (cf. dossier stratégique §07 :
  // acompte/facture/contrat via Stripe). La caution passe TOUJOURS par Stripe,
  // soit via Payment Sheet natif Flutter, soit via un lien Checkout Session
  // que l'admin envoie au client depuis le dialog "Réserver + lien Stripe".
  let step2State: StepState = 'todo'
  let step2Hint: string | undefined
  let step2Cta: string | undefined
  if (isCancelled) {
    step2State = 'blocked'
    step2Hint = 'Réservation annulée'
  } else if (paymentSucceeded || isConfirmed) {
    step2State = 'done'
    step2Hint = 'Caution Stripe reçue'
  } else if (paymentFailed) {
    step2State = 'blocked'
    step2Hint = 'Dernier paiement en échec'
    step2Cta = 'Renvoyer un lien Stripe'
  } else {
    step2State = 'active'
    step2Hint = 'Client doit payer la caution via Stripe'
    step2Cta = 'Envoyer le lien Stripe'
  }
  const step2: StepDef = {
    key: 'deposit',
    label: 'Caution payée',
    shortLabel: 'Caution',
    state: step2State,
    hint: step2Hint,
    cta: step2Cta,
  }

  // Étape 3 — Justificatifs client (pas d'info dans le payload actuel,
  // on l'active dès que la caution est payée — le compteur exact
  // viendra quand on ajoutera un champ documentsCount côté back)
  let step3State: StepState = 'todo'
  let step3Cta: string | undefined
  if (isCancelled) {
    step3State = 'blocked'
  } else if (step2State === 'done') {
    step3State = 'active'
    step3Cta = 'Voir les justificatifs'
  }
  const step3: StepDef = {
    key: 'docs_client',
    label: 'Justificatifs client',
    shortLabel: 'Justifs',
    state: step3State,
    hint: 'Pièce ID + justif domicile à valider',
    cta: step3Cta,
  }

  // Étape 4 — Dossier d'import (à démarrer quand caution payée)
  // Pas de lien Import->Reservation exposé dans le type actuel, on
  // reste sur "à démarrer" tant que Vehicle n'est pas sold.
  let step4State: StepState = 'todo'
  let step4Cta: string | undefined
  if (isCancelled) {
    step4State = 'blocked'
  } else if (vehicleSold) {
    step4State = 'done'
  } else if (step2State === 'done' && vehicleReserved) {
    step4State = 'active'
    step4Cta = 'Ouvrir le dossier import'
  }
  const step4: StepDef = {
    key: 'import',
    label: 'Dossier d\'import',
    shortLabel: 'Import',
    state: step4State,
    hint: 'Recherche · Transport · Dédouanement · Immat FR',
    cta: step4Cta,
  }

  // Étape 5 — Livraison
  const step5State: StepState = isCancelled
    ? 'blocked'
    : vehicleSold
      ? 'done'
      : 'todo'
  const step5: StepDef = {
    key: 'delivery',
    label: 'Livraison',
    shortLabel: 'Livraison',
    state: step5State,
    hint: vehicleSold ? 'Livré et facturé' : 'Fin du workflow',
  }

  return [step1, step2, step3, step4, step5]
}

function iconFor(state: StepState) {
  switch (state) {
    case 'done':
      return <Check className="h-3.5 w-3.5" />
    case 'active':
      return <Clock className="h-3.5 w-3.5" />
    case 'blocked':
      return <AlertCircle className="h-3.5 w-3.5" />
    default:
      return <Circle className="h-3.5 w-3.5" />
  }
}

function nodeClasses(state: StepState) {
  switch (state) {
    case 'done':
      return 'bg-green-500 text-white ring-green-500/20'
    case 'active':
      return 'bg-orange-500 text-white ring-orange-500/30 animate-pulse'
    case 'blocked':
      return 'bg-red-500 text-white ring-red-500/20'
    default:
      return 'bg-muted text-muted-foreground ring-muted/40'
  }
}

function connectorClasses(state: StepState) {
  // Le connecteur (barre) reflète l'état de l'étape à sa gauche.
  return state === 'done' ? 'bg-green-500' : 'bg-muted'
}

export function ReservationWorkflowTimeline({
  reservation,
  vehicle,
  compact = false,
  onCta,
}: ReservationWorkflowTimelineProps) {
  const steps = useMemo(() => computeSteps(reservation, vehicle), [reservation, vehicle])

  const activeStep = steps.find((s) => s.state === 'active')

  return (
    <div className={cn('rounded-lg border bg-card', compact ? 'p-3' : 'p-4')}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold">Workflow réservation</p>
            <p className="text-xs text-muted-foreground">
              Suivi étape par étape · cf. docs/WORKFLOW_STRADA.md
            </p>
          </div>
          {activeStep?.cta && onCta && (
            <button
              type="button"
              onClick={() => onCta(activeStep.key)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {activeStep.cta} →
            </button>
          )}
        </div>
      )}

      {/*
        Timeline horizontale : chaque étape = un nœud circulaire + label
        au-dessous. Un connecteur (barre) entre chaque étape. Le tout
        scrollable horizontalement si l'écran est petit.
      */}
      <div className="flex items-start gap-0 overflow-x-auto pb-1">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-start flex-1 min-w-[80px]">
            {/* Nœud + label */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'h-8 w-8 rounded-full ring-4 flex items-center justify-center flex-shrink-0',
                  nodeClasses(step.state),
                )}
                title={step.hint}
              >
                {iconFor(step.state)}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    'text-[10px] font-medium leading-tight',
                    step.state === 'active' ? 'text-orange-600' :
                    step.state === 'done' ? 'text-foreground' :
                    step.state === 'blocked' ? 'text-red-600' :
                    'text-muted-foreground',
                  )}
                >
                  {compact ? step.shortLabel : step.label}
                </p>
                {!compact && step.hint && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[110px]">
                    {step.hint}
                  </p>
                )}
              </div>
            </div>

            {/* Connecteur horizontal entre 2 nœuds (pas après le dernier) */}
            {idx < steps.length - 1 && (
              <div className="flex-1 h-8 flex items-center min-w-[20px]">
                <div className={cn('h-0.5 w-full', connectorClasses(step.state))} />
              </div>
            )}
          </div>
        ))}
      </div>

      {compact && activeStep?.cta && onCta && (
        <button
          type="button"
          onClick={() => onCta(activeStep.key)}
          className="mt-3 w-full text-xs font-medium text-primary hover:underline text-center"
        >
          {activeStep.cta} →
        </button>
      )}
    </div>
  )
}
