import apiClient from '@/lib/api-client'
import type { Reservation } from '@/types'

/**
 * Wrapper HTTP autour du module reservations du back-end.
 *
 * ⚠️ `GET /reservations` est réservé aux rôles admin/agent (guard côté back).
 * Depuis l'admin app on est toujours dans ce cas, donc pas de restriction ici.
 *
 * Endpoints exposés côté back (backend/src/reservations/reservations.controller.ts) :
 *   POST   /reservations                 → créer (customer ou admin/agent via targetUserId)
 *   GET    /reservations                 → admin/agent : toutes
 *   GET    /reservations/mine            → utilisateur courant
 *   GET    /reservations/:id             → détail (owner uniquement — check côté back)
 *   DELETE /reservations/:id/cancel      → annuler
 */
export const reservationsService = {
  /**
   * Crée une réservation. Admin/agent peut passer `targetUserId` pour réserver
   * au nom d'un client. Retour : Reservation en `pending_payment` — le paiement
   * doit ensuite être initié via paymentsService.createCheckoutSession() pour
   * générer le lien Stripe à envoyer au client.
   */
  create: async (payload: {
    vehicleId: string
    targetUserId?: string
  }): Promise<Reservation> => {
    const { data } = await apiClient.post<Reservation>('/reservations', payload)
    return data
  },

  /** Liste toutes les réservations (admin/agent), du plus récent au plus ancien. */
  getAll: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>('/reservations')
    return Array.isArray(data) ? data : []
  },

  /** Réservations de l'utilisateur connecté. */
  getMine: async (): Promise<Reservation[]> => {
    const { data } = await apiClient.get<Reservation[]>('/reservations/mine')
    return Array.isArray(data) ? data : []
  },

  /** Détail d'une réservation. Côté back, seul le owner (ou admin/agent) peut lire. */
  getOne: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.get<Reservation>(`/reservations/${id}`)
    return data
  },

  /** Annuler une réservation. Le back repasse le véhicule en `available`. */
  cancel: async (id: string): Promise<Reservation> => {
    const { data } = await apiClient.delete<Reservation>(`/reservations/${id}/cancel`)
    return data
  },
}
