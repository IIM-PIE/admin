import apiClient from '@/lib/api-client'
import type { Document, PaginatedResponse, PaginationParams } from '@/types'

interface DocumentFilters extends PaginationParams {
  importId?: string
  listingId?: string
  conversationId?: string
  userId?: string
  status?: string
}

export const documentsService = {
  getDocuments: async (params?: DocumentFilters): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[] | PaginatedResponse<Document>>('/documents', {
      params,
    })
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },

  getDocument: async (id: string): Promise<Document> => {
    const { data } = await apiClient.get<Document>(`/documents/${id}`)
    return data
  },

  /**
   * Ouvre un document privé. Le back vérifie l'authz puis renvoie un HTTP
   * 302 vers une URL Garage présignée valide 5 min. On récupère cette URL
   * via /signed-url (le back la garantit unique-use côté S3 par la signature
   * HMAC), puis on l'ouvre dans un nouvel onglet. Rien ne transite par le
   * back au moment du download — le browser va lire direct chez Garage.
   *
   * On préfère /signed-url à un window.open direct sur /download parce que
   * l'ouverture d'un nouvel onglet ne transmet pas le Bearer JWT — l'endpoint
   * /signed-url l'accepte, retourne l'URL, et on ouvre l'URL S3 qui elle
   * embarque sa propre signature.
   */
  openDocument: async (id: string): Promise<void> => {
    const { data } = await apiClient.get<{ url: string }>(
      `/documents/${id}/signed-url?expiresIn=300`,
    )
    window.open(data.url, '_blank', 'noopener,noreferrer')
  },

  /**
   * Upload d'un document — cible (listingId | importId | conversationId) fournie
   * par le caller selon le contexte d'upload :
   *   - depuis la fiche annonce → listingId
   *   - depuis une conversation → conversationId (justificatif privé à ce chat)
   *   - depuis un dossier d'import → importId (post-réservation)
   * Le back valide un XOR strict (exactement UN parmi les 3).
   *
   * userId + category sont dérivés du JWT côté back — ne pas les envoyer.
   */
  uploadDocument: async (
    file: File,
    params: {
      listingId?: string
      importId?: string
      conversationId?: string
      type: string
      name: string
      required?: boolean
    }
  ): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)
    if (params.listingId) formData.append('listingId', params.listingId)
    if (params.importId) formData.append('importId', params.importId)
    if (params.conversationId) formData.append('conversationId', params.conversationId)
    formData.append('type', params.type)
    formData.append('name', params.name)
    formData.append('required', String(params.required || false))

    // L'intercepteur de apiClient détecte FormData et supprime le Content-Type par défaut
    // Axios gère automatiquement le Content-Type avec la boundary pour FormData
    const { data } = await apiClient.post<Document>('/documents', formData)
    return data
  },

  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document> => {
    const { data } = await apiClient.patch<Document>(`/documents/${id}`, updates)
    return data
  },

  validateDocument: async (id: string): Promise<Document> => {
    const { data } = await apiClient.patch<Document>(`/documents/${id}/validate`)
    return data
  },

  rejectDocument: async (id: string): Promise<Document> => {
    const { data } = await apiClient.patch<Document>(`/documents/${id}/reject`)
    return data
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`)
  },

  // Récupérer les documents d'un listing (docs "de la fiche annonce" — partagés
  // entre toutes les convs sur ce listing)
  getListingDocuments: async (listingId: string): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[] | PaginatedResponse<Document>>('/documents', {
      params: { listingId },
    })
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },

  // Récupérer les documents privés à une conversation (justificatifs échangés
  // dans ce chat — NE fuitent PAS vers les autres convs sur la même annonce)
  getConversationDocuments: async (conversationId: string): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[] | PaginatedResponse<Document>>('/documents', {
      params: { conversationId },
    })
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },
}
