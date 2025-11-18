import apiClient from '@/lib/api-client'
import type { Seller, PaginationParams } from '@/types'

export const sellersService = {
  getSellers: async (params?: PaginationParams): Promise<Seller[]> => {
    const { data } = await apiClient.get<Seller[]>('/sellers', { params })
    return data
  },

  getSeller: async (id: string): Promise<Seller> => {
    const { data } = await apiClient.get<Seller>(`/sellers/${id}`)
    return data
  },

  createSeller: async (seller: Partial<Seller>): Promise<Seller> => {
    const { data } = await apiClient.post<Seller>('/sellers', seller)
    return data
  },

  updateSeller: async (id: string, updates: Partial<Seller>): Promise<Seller> => {
    const { data } = await apiClient.patch<Seller>(`/sellers/${id}`, updates)
    return data
  },

  deleteSeller: async (id: string): Promise<void> => {
    await apiClient.delete(`/sellers/${id}`)
  },
}
