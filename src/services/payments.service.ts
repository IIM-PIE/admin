import apiClient from '@/lib/api-client'
import type { Payment, PaymentStatus, Reservation, User, Vehicle } from '@/types'

/**
 * Wrapper HTTP autour du module payments du back-end.
 *
 * Endpoints exposés côté back (backend/src/payments/payments.controller.ts) :
 *   POST /payments/reservations/:id/payment-intent   → client mobile Flutter (Payment Sheet native)
 *   POST /payments/reservations/:id/checkout-session → admin/agent : URL Stripe hébergée à envoyer au client
 *   GET  /payments                                   → admin/agent : liste tous les paiements
 *   GET  /payments/mine                              → paiements de l'utilisateur courant
 */

export interface CheckoutSessionResponse {
  checkoutUrl: string
  sessionId: string
  expiresAt: string
}

/**
 * Payment enrichi renvoyé par GET /payments — inclut user (via reservation.user)
 * et vehicle (via reservation.vehicle) pour l'affichage en tableau back-office.
 */
export interface AdminPayment extends Payment {
  reservation?: Pick<Reservation, 'id' | 'status' | 'depositAmount'> & {
    user?: Pick<User, 'id' | 'name' | 'email'>
    vehicle?: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'price' | 'images'>
  }
}

export const paymentsService = {
  /**
   * Génère une Stripe Checkout Session pour une Reservation `pending_payment`.
   * Retourne l'URL à envoyer au client via le chat. Le webhook Stripe fera
   * basculer la Reservation en `confirmed` quand le client aura payé.
   *
   * ⚠️ Admin/agent uniquement (guard côté back).
   */
  createCheckoutSession: async (reservationId: string): Promise<CheckoutSessionResponse> => {
    const { data } = await apiClient.post<CheckoutSessionResponse>(
      `/payments/reservations/${reservationId}/checkout-session`,
    )
    return data
  },

  /**
   * Liste tous les paiements — admin/agent uniquement. Filtre optionnel par
   * statut (pending / succeeded / failed / cancelled).
   */
  getAll: async (status?: PaymentStatus): Promise<AdminPayment[]> => {
    const { data } = await apiClient.get<AdminPayment[]>('/payments', {
      params: status ? { status } : undefined,
    })
    return Array.isArray(data) ? data : []
  },
}
