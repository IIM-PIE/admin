/**
 * Métadonnées UX par transition — un bloc par `OrderStatus` cible.
 *
 * La modale de confirmation dans `routes/orders.$id.tsx` consomme ce
 * mapping pour afficher un titre, une description, des prérequis, des
 * effets induits, des avertissements et des inputs contextualisés selon
 * la transition demandée. Objectif : plus jamais de wording générique
 * ("Passer la commande à X") qui laisse l'admin deviner ce qui va se
 * passer.
 *
 * Règle simple : la description dit ce qui CHANGE, les effets disent ce
 * qui SE PASSE DERRIÈRE (autres acteurs notifiés, effets latéraux en
 * base), les warnings pointent l'irréversibilité ou les gestes hors app
 * à ne pas oublier.
 *
 * Cancel n'est PAS dans ce mapping — la modale dédiée `cancelDialog` a
 * ses propres fields (motif + politique refund override) et son propre
 * wording contextualisé au statut source.
 */

import type { OrderStatus } from '@/services/orders.service'

export type TransitionInput = {
  key: 'payoutReference'
  label: string
  placeholder: string
  hint: string
  required: boolean
}

export type TransitionMeta = {
  title: string
  description: string
  effects: string[]
  prerequisites?: string[]
  warnings?: string[]
  inputs?: TransitionInput[]
  confirmLabel: string
  confirmVariant: 'default' | 'destructive'
}

export const ORDER_TRANSITION_META: Partial<Record<OrderStatus, TransitionMeta>> = {
  awaiting_client_docs: {
    title: "Ouvrir l'accueil des pièces client",
    description:
      "La commande passe en attente des 3 pièces client (CNI, justif de domicile, justif de virement du solde). Le client peut envoyer ses documents depuis l'app.",
    effects: [
      "Le client reçoit une notif l'invitant à envoyer ses 3 pièces.",
    ],
    warnings: [
      "Rare en flow normal — depuis le 2026-07-21 les nouvelles commandes naissent directement en attente de pièces. À utiliser uniquement pour rattraper une commande créée avant cette date ou coincée en deposit_paid_reserved.",
    ],
    confirmLabel: "Ouvrir l'accueil des pièces",
    confirmVariant: 'default',
  },

  client_docs_validated: {
    title: 'Forcer la validation des pièces',
    description:
      "Bascule manuelle vers « Pièces client validées ». En flow normal, cette bascule est AUTOMATIQUE dès que les 3 pièces sont validées individuellement au-dessus — utilise ce bouton uniquement si l'auto-transition n'a pas eu lieu (ex: docs reçus hors app, cas ops).",
    prerequisites: [
      "Les 3 pièces obligatoires (CNI, justif de domicile, justif de virement) doivent avoir été validées individuellement au-dessus.",
      "Le virement du solde client doit être visible sur le compte bancaire Strada.",
    ],
    effects: [
      "escrowReceivedAt posé (Strada acte la réception du solde).",
      "Le client reçoit une notif « Pièces validées ».",
      "L'étape 2 passe en 🟩 vert coché, l'étape 3 devient courante.",
    ],
    warnings: [
      "Le back refuse la bascule si les 3 pièces ne sont pas toutes en « validated ». Vérifie le compteur x/3.",
      "Rejeter une pièce après la bascule fait rollback auto vers « En attente pièces client » — l'étape 2 redevient courante.",
    ],
    confirmLabel: 'Forcer la bascule',
    confirmVariant: 'default',
  },

  payout_initiated: {
    title: 'Initier le virement au concessionnaire',
    description:
      "Vous vous apprêtez à confirmer que le virement bancaire Strada → concessionnaire a été émis. Ce n'est PAS le back qui lance le virement — c'est un geste externe que vous faites depuis l'interface bancaire Strada.",
    prerequisites: [
      "Le virement doit avoir été émis manuellement depuis la banque Strada.",
      "Montant à virer : Order.sellerNetPayoutAmount = vehicleTotalAmount − commission Strada 2 %.",
    ],
    effects: [
      "La commande passe en « Paiement garanti par Strada » côté client et pro.",
      "Le concessionnaire reçoit une notif l'invitant à confirmer la réception sur son compte bancaire.",
    ],
    warnings: [
      "Rollback possible ensuite mais ne rappelle PAS le virement bancaire — à annuler manuellement en banque si besoin.",
    ],
    inputs: [
      {
        key: 'payoutReference',
        label: 'Référence bancaire du virement',
        placeholder: 'Ex. VIR-2026-07-INT-042',
        hint: "Tracée dans l'audit_log pour retrouver l'opération bancaire correspondante en cas de litige.",
        required: true,
      },
    ],
    confirmLabel: "Confirmer l'émission",
    confirmVariant: 'default',
  },

  sale_docs_prepared: {
    title: 'Docs de vente préparés',
    description:
      "Confirmer que la facture italienne + la carte grise annulée ont été préparées côté Strada et sont prêtes pour le transporteur.",
    effects: [
      "Le concessionnaire reçoit une notif pour déclarer le véhicule prêt à l'enlèvement.",
    ],
    confirmLabel: 'Confirmer la préparation',
    confirmVariant: 'default',
  },

  in_transit: {
    title: 'Passer en transit',
    description:
      "Confirmer que le transporteur a pris en charge le véhicule chez le concessionnaire, en route vers la France.",
    effects: [
      "Le client reçoit une notif « En transit vers la France ».",
    ],
    warnings: [
      "Jalon irréversible — pas de rollback possible depuis « en transit » (la voiture est physiquement en route).",
    ],
    confirmLabel: 'Marquer en transit',
    confirmVariant: 'default',
  },

  delivered: {
    title: 'Marquer comme livrée',
    description:
      "Confirmer que le véhicule a été livré au client au point relais convenu.",
    effects: [
      "Le client reçoit une notif « Livrée ».",
      "La commande est terminée — plus d'actions possibles ensuite.",
    ],
    warnings: [
      "Jalon irréversible — pas de rollback depuis « livrée ».",
    ],
    confirmLabel: 'Confirmer la livraison',
    confirmVariant: 'default',
  },

  // NB: `cancelled` n'est PAS dans ce mapping — l'annulation utilise sa
  // propre modale dédiée (motif + politique refund override + note libre)
  // ouverte via un bouton distinct. Si un jour la state machine renvoie
  // `cancelled` dans `availableTransitions`, on redirige côté handler
  // vers cette modale dédiée plutôt que d'utiliser celle générique.
}

/**
 * Fallback si un status n'a pas encore de meta dédiée — évite qu'un
 * ajout d'enum côté back explose la modale. Le contenu reste générique
 * mais neutre, on peut enrichir progressivement.
 */
export function getTransitionMeta(status: OrderStatus): TransitionMeta {
  return (
    ORDER_TRANSITION_META[status] ?? {
      title: 'Confirmer la transition',
      description: `Passer la commande au statut « ${status} ».`,
      effects: [],
      confirmLabel: 'Confirmer',
      confirmVariant: 'default',
    }
  )
}
