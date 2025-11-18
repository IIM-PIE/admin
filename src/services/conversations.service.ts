import apiClient from '@/lib/api-client'
import type { Conversation, Message, PaginationParams } from '@/types'

interface ConversationFilters extends PaginationParams {
  userId?: string
  status?: string
}

export const conversationsService = {
  getConversations: async (params?: ConversationFilters): Promise<Conversation[]> => {
    const { data } = await apiClient.get<Conversation[]>('/conversations', { params })
    return data
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

  // Messages
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const { data } = await apiClient.get<Message[]>('/messages', {
      params: { conversationId },
    })
    return data
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
