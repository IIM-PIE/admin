import apiClient from '@/lib/api-client'
import type { Conversation, Message, PaginatedResponse, PaginationParams } from '@/types'

interface ConversationFilters extends PaginationParams {
  userId?: string
  listingId?: string
  status?: string
}

export const conversationsService = {
  getConversations: async (params?: ConversationFilters): Promise<Conversation[]> => {
    const { data } = await apiClient.get<Conversation[] | PaginatedResponse<Conversation>>(
      '/conversations',
      { params }
    )
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },

  getConversation: async (id: string): Promise<Conversation> => {
    const { data } = await apiClient.get<Conversation>(`/conversations/${id}`)
    return data
  },

  createConversation: async (conversation: Partial<Conversation>): Promise<Conversation> => {
    const { data } = await apiClient.post<Conversation>('/conversations', conversation)
    return data
  },

  updateConversation: async (id: string, updates: Partial<Conversation>): Promise<Conversation> => {
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}`, updates)
    return data
  },

  markAsRead: async (id: string): Promise<Conversation> => {
    const { data } = await apiClient.patch<Conversation>(`/conversations/${id}/read`)
    return data
  },

  deleteConversation: async (id: string): Promise<void> => {
    await apiClient.delete(`/conversations/${id}`)
  },

  // Récupérer les conversations d'un listing
  getListingConversations: async (listingId: string, userId?: string): Promise<Conversation[]> => {
    const { data } = await apiClient.get<Conversation[] | PaginatedResponse<Conversation>>(
      `/conversations/listing/${listingId}`,
      { params: userId ? { userId } : {} }
    )
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data } = await apiClient.get<Message[] | PaginatedResponse<Message>>('/messages', {
      params: { conversationId },
    })
    const payload: any = (data as any)?.data ?? data
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.data)) return payload.data
    return []
  },

  sendMessage: async (message: Partial<Message>): Promise<Message> => {
    const { data } = await apiClient.post<Message>('/messages', message)
    return data
  },

  updateMessage: async (id: string, updates: Partial<Message>): Promise<Message> => {
    const { data } = await apiClient.patch<Message>(`/messages/${id}`, updates)
    return data
  },

  deleteMessage: async (id: string): Promise<void> => {
    await apiClient.delete(`/messages/${id}`)
  },
}
