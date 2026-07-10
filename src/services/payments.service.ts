import apiClient from '@/lib/api-client'

/**
 * Wrapper HTTP autour du module payments du back-end.
 *
 * Endpoints exposés côté back (backend/src/payments/payments.controller.ts) :
 *   POST /payments/reservations/:id/payment-intent   → client mobile Flutter (Payment Sheet native)
 *   POST /payments/reservations/:id/checkout-session → admin/agent : URL Stripe hébergée à envoyer au client
 *   GET  /payments/mine                              → paiements de l'utilisateur courant
 */

export interface CheckoutSessionResponse {
  checkoutUrl: string
  sessionId: string
  expiresAt: string
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
}
