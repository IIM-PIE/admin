import apiClient from '@/lib/api-client'

export type ClientDocumentType =
  | 'carte_identite'
  | 'passeport'
  | 'justificatif_domicile'
  | 'justificatif_virement'
  | 'rib'

export type ClientDocumentStatus =
  | 'pending_validation'
  | 'active'
  | 'rejected'
  | 'expired'
  | 'revoked'

export interface ClientDocument {
  id: string
  userId: string
  type: ClientDocumentType
  name: string
  fileUrl: string
  mimeType: string | null
  fileSize: number | null
  uploadedAt: string
  uploadedByUserId: string | null
  expiresAt: string
  consentGivenAt: string
  consentText: string
  status: ClientDocumentStatus
  validatedAt: string | null
  validatedByUserId: string | null
  rejectedAt: string | null
  rejectedByUserId: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  user?: { id: string; name: string; email: string }
}

export interface PaginatedClientDocuments {
  data: ClientDocument[]
  meta: { total: number; page: number; limit: number; pages: number }
}

export const clientDocumentsService = {
  listAll: async (
    status?: ClientDocumentStatus,
    page = 1,
    limit = 30,
  ): Promise<PaginatedClientDocuments> => {
    const { data } = await apiClient.get<PaginatedClientDocuments>(
      '/client-documents/all',
      { params: { status, page, limit } },
    )
    return data
  },

  listByUser: async (userId: string): Promise<ClientDocument[]> => {
    const { data } = await apiClient.get<ClientDocument[]>(
      `/client-documents/user/${userId}`,
    )
    return data
  },

  validate: async (id: string): Promise<ClientDocument> => {
    const { data } = await apiClient.patch<ClientDocument>(
      `/client-documents/${id}/validate`,
      {},
    )
    return data
  },

  reject: async (id: string, reason: string): Promise<ClientDocument> => {
    const { data } = await apiClient.patch<ClientDocument>(
      `/client-documents/${id}/reject`,
      { reason },
    )
    return data
  },

  scanExpiring: async (
    daysAhead = 30,
  ): Promise<{
    scanned: number
    notified: number
    skipped: number
    horizonDays: number
  }> => {
    const { data } = await apiClient.post(
      '/client-documents/scan-expiring',
      undefined,
      { params: { daysAhead } },
    )
    return data
  },
}
