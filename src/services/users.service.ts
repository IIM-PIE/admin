import apiClient from '@/lib/api-client'
import type { User, PaginationParams, PaginatedResponse } from '@/types'

export const usersService = {
  getUsers: async (params?: PaginationParams): Promise<User[]> => {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params })
    return data.data
  },

  getUser: async (id: string): Promise<User> => {
    const { data } = await apiClient.get<User>(`/users/${id}`)
    return data
  },

  getUserDashboardStats: async (id: string): Promise<any> => {
    const { data } = await apiClient.get(`/users/${id}/dashboard-stats`)
    return data
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const { data} = await apiClient.patch<User>(`/users/${id}`, updates)
    return data
  },

  toggleVerification: async (id: string): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}/verify`)
    return data
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}
