import apiClient from '@/lib/api-client'
import type { Document, PaginationParams } from '@/types'

interface DocumentFilters extends PaginationParams {
  importId?: string
  userId?: string
  status?: string
}

export const documentsService = {
  getDocuments: async (params?: DocumentFilters): Promise<Document[]> => {
    const { data } = await apiClient.get<Document[]>('/documents', { params })
    return data
  },

  getDocument: async (id: string): Promise<Document> => {
    const { data } = await apiClient.get<Document>(`/documents/${id}`)
    return data
  },

  getDownloadUrl: async (id: string): Promise<{ url: string }> => {
    const { data } = await apiClient.get<{ url: string }>(`/documents/${id}/download`)
    return data
  },

  uploadDocument: async (document: Partial<Document>): Promise<Document> => {
    const { data } = await apiClient.post<Document>('/documents', document)
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
}
