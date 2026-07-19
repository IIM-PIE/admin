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
   * Récupère le contenu du document via le back (StreamableFile), crée une
   * URL blob locale, l'ouvre dans un nouvel onglet, puis la révoque quand
   * l'onglet ferme la ressource. Le fichier ne transite plus par une URL
   * S3 externe — tout reste sur le domaine app.
   */
  openDocument: async (id: string): Promise<void> => {
    const { data, headers } = await apiClient.get<Blob>(`/documents/${id}/download`, {
      responseType: 'blob',
    })
    const contentType = headers['content-type'] || 'application/octet-stream'
    const blob = new Blob([data], { type: contentType })
    const url = URL.createObjectURL(blob)
    // Le tab garde l'URL vivante tant qu'il est ouvert ; on la révoque après
    // 60 s côté page d'origine, suffisant pour que le navigateur ait chargé.
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
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
