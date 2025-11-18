import apiClient from '@/lib/api-client'
import type { ExternalListing, PaginationParams } from '@/types'

interface ExternalListingFilters extends PaginationParams {
  userId?: string
  status?: string
}

export const externalListingsService = {
  getExternalListings: async (params?: ExternalListingFilters): Promise<ExternalListing[]> => {
    const { data } = await apiClient.get<ExternalListing[]>('/external-listings', { params })
    return data
  },

  getExternalListing: async (id: string): Promise<ExternalListing> => {
    const { data } = await apiClient.get<ExternalListing>(`/external-listings/${id}`)
    return data
  },

  createExternalListing: async (listing: Partial<ExternalListing>): Promise<ExternalListing> => {
    const { data } = await apiClient.post<ExternalListing>('/external-listings', listing)
    return data
  },

  updateExternalListing: async (id: string, updates: Partial<ExternalListing>): Promise<ExternalListing> => {
    const { data } = await apiClient.patch<ExternalListing>(`/external-listings/${id}`, updates)
    return data
  },

  deleteExternalListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/external-listings/${id}`)
  },
}
