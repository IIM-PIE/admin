import apiClient from '@/lib/api-client'

export type ReviewTarget = 'seller' | 'strada'
export type ReviewStatus = 'pending_moderation' | 'published' | 'rejected' | 'hidden'

export interface Review {
  id: string
  orderId: string
  userId: string
  target: ReviewTarget
  sellerId: string | null
  ratingOverall: number
  aspects: Record<string, number>
  comment: string | null
  status: ReviewStatus
  moderatedAt: string | null
  moderatedByUserId: string | null
  rejectionReason: string | null
  createdAt: string
  user?: { id: string; name: string; email: string }
  seller?: { id: string; name: string } | null
  order?: { id: string; orderNumber: string }
}

export interface PaginatedReviews {
  data: Review[]
  meta: { total: number; page: number; limit: number; pages: number }
}

export const reviewsService = {
  listForModeration: async (
    status?: ReviewStatus,
    page = 1,
    limit = 20,
  ): Promise<PaginatedReviews> => {
    const { data } = await apiClient.get<PaginatedReviews>('/reviews/moderation', {
      params: { status, page, limit },
    })
    return data
  },

  approve: async (id: string): Promise<Review> => {
    const { data } = await apiClient.patch<Review>(`/reviews/${id}/approve`, {})
    return data
  },

  reject: async (id: string, reason: string): Promise<Review> => {
    const { data } = await apiClient.patch<Review>(`/reviews/${id}/reject`, { reason })
    return data
  },

  hide: async (id: string, reason: string): Promise<Review> => {
    const { data } = await apiClient.patch<Review>(`/reviews/${id}/hide`, { reason })
    return data
  },
}
