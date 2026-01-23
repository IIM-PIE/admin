import apiClient from '@/lib/api-client'
import type { Document, PaginatedResponse, PaginationParams } from '@/types'

interface DocumentFilters extends PaginationParams {
  importId?: string
  listingId?: string
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

  getDownloadUrl: async (id: string): Promise<{ url: string }> => {
    const { data } = await apiClient.get<{ url: string }>(`/documents/${id}/download`)
    return data
  },

  uploadDocument: async (
    file: File,
    params: {
      userId: string
      listingId?: string
      importId?: string
      type: string
      category: 'user_uploaded' | 'admin_provided'
      name: string
      required?: boolean
    }
  ): Promise<Document> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', params.userId)
    if (params.listingId) formData.append('listingId', params.listingId)
    if (params.importId) formData.append('importId', params.importId)
    formData.append('type', params.type)
    formData.append('category', params.category)
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

  // Récupérer les documents d'un listing
  getListingDocuments: async (listingId: string): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[] | PaginatedResponse<Document>>('/documents', {
      params: { listingId },
    })
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },
}
