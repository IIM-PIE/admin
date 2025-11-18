import apiClient from '@/lib/api-client'
import type { Quote, PaginationParams, PaginatedResponse } from '@/types'

interface QuoteFilters extends PaginationParams {
  userId?: string
  status?: string
}

export const quotesService = {
  getQuotes: async (params?: QuoteFilters): Promise<Quote[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Quote>>('/quotes', { params })
    return data.data
  },

  getQuote: async (id: string): Promise<Quote> => {
    const { data } = await apiClient.get<Quote>(`/quotes/${id}`)
    return data
  },

  createQuote: async (quote: Partial<Quote>): Promise<Quote> => {
    const { data } = await apiClient.post<Quote>('/quotes', quote)
    return data
  },

  requestQuote: async (quoteRequest: {
    vehicleId?: string
    externalListingId?: string
  }): Promise<Quote> => {
    const { data } = await apiClient.post<Quote>('/quotes/request', quoteRequest)
    return data
  },

  updateQuote: async (id: string, updates: Partial<Quote>): Promise<Quote> => {
    const { data } = await apiClient.patch<Quote>(`/quotes/${id}`, updates)
    return data
  },

  acceptQuote: async (id: string): Promise<Quote> => {
    const { data } = await apiClient.patch<Quote>(`/quotes/${id}/accept`)
    return data
  },

  rejectQuote: async (id: string): Promise<Quote> => {
    const { data } = await apiClient.patch<Quote>(`/quotes/${id}/reject`)
    return data
  },

  deleteQuote: async (id: string): Promise<void> => {
    await apiClient.delete(`/quotes/${id}`)
  },
}
