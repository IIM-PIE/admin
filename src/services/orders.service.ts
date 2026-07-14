import apiClient from '@/lib/api-client'

/**
 * Wrapper HTTP autour du module admin-orders du back.
 *
 * Endpoints exposés (backend/src/admin-orders/admin-orders.controller.ts) :
 *   GET   /admin/orders           → liste paginée (admin/agent)
 *   GET   /admin/orders/:id       → détail
 *   PATCH /admin/orders/:id/status → transition (validée par state machine)
 */

export type OrderStatus =
  | 'deposit_pending'
  | 'deposit_paid_reserved'
  | 'client_docs_pending'
  | 'client_docs_validated'
  | 'balance_pending'
  | 'balance_escrowed'
  | 'payout_initiated'
  | 'payout_confirmed'
  | 'b2b_docs_uploaded'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

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
  createdAt: string
  updatedAt: string
  seller: { id: string; name: string; ragioneSociale: string | null; city: string | null }
  user: { id: string; name: string; email: string }
  vehicle: { id: string; brand: string; model: string; year: number }
}

export interface OrderDetail extends OrderListItem {
  reservation: {
    id: string
    status: string
    depositAmount: string
    createdAt: string
  } | null
  documents: Array<{
    id: string
    type: string
    name: string
    fileUrl: string
    isSensitive: boolean
    uploadedAt: string
  }>
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

export interface OrderStats {
  totalCount: number
  activeCount: number
  deliveredCount: number
  cancelledCount: number
  readyForPickupCount: number
  inTransitCount: number
  /** Montant total séquestré (balance_escrowed + payout_initiated), string decimal. */
  escrowInFlightAmount: string
  byStatus: Partial<Record<OrderStatus, number>>
}

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

  getStats: async (): Promise<OrderStats> => {
    const { data } = await apiClient.get<OrderStats>('/admin/orders/stats')
    return data
  },
}

// --- Constantes UI partagées entre routes / composants ---

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  deposit_pending: 'Acompte en attente',
  deposit_paid_reserved: 'Acompte versé — réservé',
  client_docs_pending: 'Docs client en attente',
  client_docs_validated: 'Docs client validés',
  balance_pending: 'Solde en attente',
  balance_escrowed: 'Solde reçu — séquestré',
  payout_initiated: 'Virement concessionnaire initié',
  payout_confirmed: 'Virement concessionnaire confirmé',
  b2b_docs_uploaded: 'Docs B2B téléversés',
  ready_for_pickup: 'Prêt pour enlèvement',
  in_transit: 'En transit',
  delivered: 'Livré',
  cancelled: 'Annulée',
}

/** Étape fonctionnelle (1-8) correspondant à chaque statut. */
export const ORDER_STATUS_STEP: Record<OrderStatus, number> = {
  deposit_pending: 1,
  deposit_paid_reserved: 1,
  client_docs_pending: 2,
  client_docs_validated: 2,
  balance_pending: 3,
  balance_escrowed: 3,
  payout_initiated: 4,
  payout_confirmed: 4,
  b2b_docs_uploaded: 5,
  ready_for_pickup: 6,
  in_transit: 6,
  delivered: 8,
  cancelled: 0,
}

/**
 * Table des transitions autorisées — miroir de la state machine côté back.
 * Utilisée pour n'afficher que les boutons de transition valides depuis le
 * statut courant, mais le back reste la source de vérité (rejette une
 * transition invalide même si le front la laisse passer).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  deposit_pending: ['deposit_paid_reserved', 'cancelled'],
  deposit_paid_reserved: ['client_docs_pending', 'cancelled'],
  client_docs_pending: ['client_docs_validated', 'cancelled'],
  client_docs_validated: ['balance_pending', 'cancelled'],
  balance_pending: ['balance_escrowed'],
  balance_escrowed: ['payout_initiated'],
  payout_initiated: ['payout_confirmed'],
  payout_confirmed: ['b2b_docs_uploaded'],
  b2b_docs_uploaded: ['ready_for_pickup'],
  ready_for_pickup: ['in_transit'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const STEP_LABELS: Record<number, string> = {
  1: 'Réservation + acompte',
  2: 'Préparation dossier',
  3: 'Paiement solde',
  4: 'Payout concessionnaire',
  5: 'Docs B2B',
  6: 'Enlèvement',
  7: 'Démarches françaises',
  8: 'Livraison',
}
