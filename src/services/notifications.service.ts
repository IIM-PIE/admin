import apiClient from '@/lib/api-client'
import type { Notification, PaginationParams } from '@/types'

interface NotificationFilters extends PaginationParams {
  userId?: string
  isRead?: boolean
}

export const notificationsService = {
  getNotifications: async (params?: NotificationFilters): Promise<Notification[]> => {
    const { data } = await apiClient.get<Notification[]>('/notifications', { params })
    return data
  },

  getNotification: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.get<Notification>(`/notifications/${id}`)
    return data
  },

  getUnreadCount: async (userId: string): Promise<{ count: number }> => {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count', {
      params: { userId },
    })
    return data
  },

  createNotification: async (notification: Partial<Notification>): Promise<Notification> => {
    const { data } = await apiClient.post<Notification>('/notifications', notification)
    return data
  },

  updateNotification: async (id: string, updates: Partial<Notification>): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}`, updates)
    return data
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/read`)
    return data
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/mark-all-read')
  },

  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`)
  },
}
