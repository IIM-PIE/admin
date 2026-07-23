import apiClient from '@/lib/api-client'

/**
 * Wrapper HTTP autour du module admin-orders du back (v2 — refactor
 * workflow du 18 juillet 2026, contrat commun Selim/Bogdan).
 *
 * Endpoints exposés :
 *   GET   /admin/orders                    → liste paginée (admin/agent)
 *   GET   /admin/orders/stats              → KPIs pipeline
 *   GET   /admin/orders/:id                → détail
 *   GET   /admin/orders/:id/history        → historique transitions
 *   PATCH /admin/orders/:id/status         → transition (state machine)
 *   POST  /admin/orders/:id/cancel         → annulation avec politique refund
 *   POST  /admin/orders/:id/rollback       → rollback un cran (admin only)
 *   PATCH /documents/:id/validate          → validation doc (déclenche
 *                                            auto-transition Order si les
 *                                            3 pièces client sont validées)
 *   PATCH /documents/:id/reject            → rejet doc avec motif enum
 */

// -- Types statut ---------------------------------------------------------

/**
 * L'enum côté back contient encore les 5 valeurs deprecated (décision #9,
 * pas de migration destructive Postgres). Le type TS reste identique — la
 * state machine ne référence que les statuts ACTIFS.
 */
export type OrderStatus =
  // Actifs (10 statuts du workflow v2)
  | 'deposit_paid_reserved'
  | 'awaiting_client_docs'
  | 'client_docs_validated'
  | 'payout_initiated'
  | 'payout_confirmed'
  | 'sale_docs_prepared'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  // Deprecated — anciens statuts encore présents en enum DB
  | 'deposit_pending'
  | 'client_docs_pending'
  | 'balance_pending'
  | 'balance_escrowed'
  | 'b2b_docs_uploaded'

export type CancellationReason = 'client_request' | 'admin_decision' | 'docs_timeout'

export type DocumentRejectionReason =
  | 'illegible'
  | 'name_mismatch'
  | 'expired'
  | 'wrong_type'
  | 'other'

// -- Interfaces API -------------------------------------------------------

export interface OrderListItem {
  id: string
  orderNumber: string
  status: OrderStatus
  depositAmount: string
  vehicleTotalAmount: string
  stradaCommission: string
  sellerNetPayoutAmount: string
  escrowReceivedAt: string | null
  payoutInitiatedAt: string | null
  payoutReference: string | null
  readyForPickupAt: string | null
  cancellationReason: CancellationReason | null
  cancellationNote: string | null
  cancelledAt: string | null
  createdAt: string
  updatedAt: string
  seller: { id: string; name: string; ragioneSociale: string | null; city: string | null }
  user: { id: string; name: string; email: string }
  vehicle: { id: string; brand: string; model: string; year: number }
}

export interface OrderDocument {
  id: string
  type: string
  name: string
  fileUrl: string
  status: 'pending' | 'validated' | 'rejected'
  isSensitive: boolean
  uploadedAt: string
  validatedAt: string | null
  rejectedAt: string | null
  rejectionReason: DocumentRejectionReason | null
  rejectionNote: string | null
}

export interface OrderDetail extends OrderListItem {
  reservation: {
    id: string
    status: string
    depositAmount: string
    createdAt: string
  } | null
  documents: OrderDocument[]
  seller: OrderListItem['seller'] & {
    partitaIva?: string | null
    codiceFiscale?: string | null
    iban?: string | null
    bic?: string | null
    address?: string | null
    postalCode?: string | null
    country?: string | null
  }
  user: OrderListItem['user'] & { phone?: string | null }
  vehicle: OrderListItem['vehicle'] & {
    price: string
    mileage: number
    location: string
  }
}

export interface ListOrdersQuery {
  status?: OrderStatus
  sellerId?: string
  userId?: string
  search?: string
  page?: number
  limit?: number
}

export interface ListOrdersResponse {
  data: OrderListItem[]
  meta: { total: number; page: number; limit: number; pages: number }
}

export interface TransitionPayload {
  status: OrderStatus
  payoutReference?: string
}

export interface CancelPayload {
  reason: CancellationReason
  refund?: boolean
  note?: string
}

export interface RollbackPayload {
  toStatus: OrderStatus
  reason: string
}

export interface RejectDocumentPayload {
  reason: DocumentRejectionReason
  note?: string
}

export interface OrderStats {
  totalCount: number
  activeCount: number
  deliveredCount: number
  cancelledCount: number
  readyForPickupCount: number
  inTransitCount: number
  escrowInFlightAmount: string
  byStatus: Partial<Record<OrderStatus, number>>
}

export interface OrderHistoryEntry {
  id: string
  createdAt: string
  action: string
  changes: {
    orderNumber?: string
    from?: OrderStatus
    to?: OrderStatus
    payoutReference?: string | null
    reason?: string
    note?: string | null
    refund?: boolean
    resetFields?: string[]
    sideEffects?: unknown
    stripeRefundPending?: boolean
    vehicleRepublished?: string
    vehicleMarkedSold?: string
  }
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

// -- Service --------------------------------------------------------------

export const ordersService = {
  list: async (q: ListOrdersQuery = {}): Promise<ListOrdersResponse> => {
    const { data } = await apiClient.get<ListOrdersResponse>('/admin/orders', { params: q })
    return data
  },

  getOne: async (id: string): Promise<OrderDetail> => {
    const { data } = await apiClient.get<OrderDetail>(`/admin/orders/${id}`)
    return data
  },

  transition: async (id: string, payload: TransitionPayload): Promise<OrderDetail> => {
    const { data } = await apiClient.patch<OrderDetail>(`/admin/orders/${id}/status`, payload)
    return data
  },

  cancel: async (id: string, payload: CancelPayload): Promise<OrderDetail> => {
    const { data } = await apiClient.post<OrderDetail>(`/admin/orders/${id}/cancel`, payload)
    return data
  },

  rollback: async (id: string, payload: RollbackPayload): Promise<OrderDetail> => {
    const { data } = await apiClient.post<OrderDetail>(`/admin/orders/${id}/rollback`, payload)
    return data
  },

  getStats: async (): Promise<OrderStats> => {
    const { data } = await apiClient.get<OrderStats>('/admin/orders/stats')
    return data
  },

  getHistory: async (id: string): Promise<OrderHistoryEntry[]> => {
    const { data } = await apiClient.get<OrderHistoryEntry[]>(`/admin/orders/${id}/history`)
    return data
  },

  validateDocument: async (documentId: string) => {
    const { data } = await apiClient.patch(`/documents/${documentId}/validate`)
    return data
  },

  rejectDocument: async (documentId: string, payload: RejectDocumentPayload) => {
    const { data } = await apiClient.patch(`/documents/${documentId}/reject`, payload)
    return data
  },
}

// -- Constantes UI --------------------------------------------------------

/**
 * Labels — wording anti-séquestre validé Selim (18 juillet 2026).
 * Aucune surface utilisateur ne montre "séquestre" côté admin ; on parle
 * de "compte Strada", "fonds garantis", "virement Strada → Pro".
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  // Actifs
  // Aligné byte-for-byte avec `backend/src/admin-orders/admin-orders.state-machine.ts::ORDER_STATUS_LABELS`.
  // Chaque libellé décrit une action DÉJÀ ACCOMPLIE — feedback Didier/Eclipse
  // 2026-07-23 : "Paiement garanti par Strada" (ancien) laissait penser qu'on
  // attend, alors que Strada a déjà émis le virement à ce statut. Pas de flèches.
  // À terme ce mapping disparaît au profit de order.statusLabel exposé par le back.
  deposit_paid_reserved: 'Acompte encaissé, véhicule réservé',
  awaiting_client_docs: 'En attente des pièces du client',
  client_docs_validated: 'Pièces du client validées et virement reçu',
  payout_initiated: 'Virement Strada émis vers le concessionnaire',
  payout_confirmed: 'Virement reçu par le pro',
  sale_docs_prepared: 'Documents de vente préparés',
  ready_for_pickup: 'Véhicule prêt pour enlèvement',
  in_transit: 'En route vers la France',
  delivered: 'Livré au client',
  cancelled: 'Annulée',
  // Deprecated
  deposit_pending: 'Acompte en attente (obsolète)',
  client_docs_pending: 'Docs client en attente (obsolète)',
  balance_pending: 'Solde en attente (obsolète)',
  balance_escrowed: 'Solde reçu (obsolète)',
  b2b_docs_uploaded: 'Docs B2B téléversés (obsolète)',
}

/**
 * Étape fonctionnelle courante du workflow — celle qui est EN ATTENTE
 * (rendue en 🟦 bleu par la timeline). 0 = annulée, 10 = tout terminé
 * (livré, aucune étape courante, toutes en 🟩 vert).
 *
 * Refonte 2026-07-24 : chaque `OrderStatus` décrit une action au passé
 * (« Acompte encaissé », « Pièces validées », « Reçu par le pro »…) — donc
 * l'étape *représentée* par ce status est en fait VALIDÉE, et l'étape
 * *courante* est la suivante (celle qui attend la prochaine action).
 * Sans ce décalage, on avait le décalage visuel remonté 2026-07-24 :
 * « le pro clique confirmer virement → step 5 reste bleu au lieu de
 * passer vert avec step 6 courante ».
 *
 * Le seul status vraiment "en attente" est `awaiting_client_docs` — pour
 * lui, currentStep = 2 (l'étape est bien celle en cours).
 */
export const ORDER_STATUS_STEP: Record<OrderStatus, number> = {
  deposit_paid_reserved: 2, // acompte encaissé → attente docs client
  awaiting_client_docs: 2, // vraie attente docs client
  client_docs_validated: 4, // pièces validées + virement reçu → attente virement pro
  payout_initiated: 5, // virement Strada émis → attente confirmation pro
  payout_confirmed: 6, // pro a confirmé → attente docs de vente
  sale_docs_prepared: 7, // docs prêts → attente déclaration pro dispo
  ready_for_pickup: 8, // véhicule prêt → attente départ transporteur
  in_transit: 9, // parti → attente livraison client
  delivered: 10, // livré, final — toutes les étapes vertes
  cancelled: 0,
  // Deprecated — alignés sur leur successeur logique
  deposit_pending: 2,
  client_docs_pending: 2,
  balance_pending: 2,
  balance_escrowed: 4,
  b2b_docs_uploaded: 7,
}

/**
 * Statuts actifs uniquement — pour le select de filtre côté UI, on ne
 * propose pas les deprecated (aucune commande n'y arrive plus).
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'deposit_paid_reserved',
  'awaiting_client_docs',
  'client_docs_validated',
  'payout_initiated',
  'payout_confirmed',
  'sale_docs_prepared',
  'ready_for_pickup',
  'in_transit',
  'delivered',
  'cancelled',
]

/**
 * Transitions AVANT autorisées — miroir de la state machine back.
 * Seuls les statuts actifs figurent avec des successeurs.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  deposit_paid_reserved: ['awaiting_client_docs', 'cancelled'],
  awaiting_client_docs: ['client_docs_validated', 'cancelled'],
  client_docs_validated: ['payout_initiated'],
  payout_initiated: ['payout_confirmed'],
  payout_confirmed: ['sale_docs_prepared'],
  sale_docs_prepared: ['ready_for_pickup'],
  ready_for_pickup: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
  // Deprecated
  deposit_pending: [],
  client_docs_pending: [],
  balance_pending: [],
  balance_escrowed: [],
  b2b_docs_uploaded: [],
}

/**
 * Transitions ARRIÈRE autorisées — matrice du rollback humain
 * (décision produit #7). Miroir de ORDER_ROLLBACK_TRANSITIONS côté back.
 */
export const ORDER_ROLLBACK_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  deposit_paid_reserved: [],
  awaiting_client_docs: ['deposit_paid_reserved'],
  client_docs_validated: ['awaiting_client_docs'],
  payout_initiated: ['client_docs_validated'],
  payout_confirmed: [], // interdit — le pro a confirmé recevoir la thune
  sale_docs_prepared: ['payout_confirmed'],
  ready_for_pickup: ['sale_docs_prepared'],
  in_transit: [], // interdit — voiture partie
  delivered: [], // interdit — client a la voiture
  cancelled: [], // interdit — commande fermée
  // Deprecated
  deposit_pending: [],
  client_docs_pending: [],
  balance_pending: [],
  balance_escrowed: [],
  b2b_docs_uploaded: [],
}

export const STEP_LABELS: Record<number, string> = {
  // Labels courts pour la timeline compact (badges d'étape). Alignés sur
  // ORDER_STATUS_LABELS mais raccourcis. Chaque libellé décrit l'action
  // accomplie à cette étape. Feedback Didier 2026-07-23.
  1: 'Acompte encaissé',
  2: 'Pièces client',
  3: 'Pièces validées',
  4: 'Virement Strada émis',
  5: 'Reçu par le pro',
  6: 'Docs de vente',
  7: 'Enlèvement',
  8: 'Transit',
  9: 'Livraison',
}

// -- Constantes UI décisions produit --------------------------------------

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  client_request: 'Désistement client (acompte retenu par défaut)',
  admin_decision: 'Décision admin — refus dossier (remboursé)',
  docs_timeout: 'Timeout J+14 sans pièces (remboursé)',
}

export const DOCUMENT_REJECTION_REASON_LABELS: Record<DocumentRejectionReason, string> = {
  illegible: 'Photo illisible',
  name_mismatch: 'Nom ne correspond pas',
  expired: 'Pièce expirée',
  wrong_type: 'Mauvais type de document',
  other: 'Autre',
}

/** Types de documents client obligatoires pour passer client_docs_validated. */
export const REQUIRED_CLIENT_DOCUMENT_TYPES = [
  'carte_identite',
  'justificatif_domicile',
  'justificatif_virement',
] as const

export type RequiredClientDocumentType = (typeof REQUIRED_CLIENT_DOCUMENT_TYPES)[number]

export const CLIENT_DOCUMENT_LABELS: Record<RequiredClientDocumentType, string> = {
  carte_identite: "Pièce d'identité",
  justificatif_domicile: 'Justificatif de domicile',
  justificatif_virement: 'Justificatif de virement',
}
