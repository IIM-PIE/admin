import apiClient from '@/lib/api-client'
import type {
  Vehicle,
  PaginationParams,
  VehicleStatus,
  FuelType,
  Transmission,
  PaginatedResponse,
  ListingStats,
  ListingFilterOptions,
} from '@/types'

interface ListingFilters extends PaginationParams {
  brand?: string
  sellerId?: string
  location?: string
  fuelType?: FuelType
  minPrice?: number
  maxPrice?: number
  minYear?: number
  maxYear?: number
  transmission?: Transmission
  status?: VehicleStatus | 'all'
}

export const listingsService = {
  getListings: async (params?: ListingFilters): Promise<PaginatedResponse<Vehicle>> => {
    const { data } = await apiClient.get<PaginatedResponse<Vehicle>>('/listings', { params })
    return data
  },

  getListing: async (id: string): Promise<Vehicle> => {
    const { data } = await apiClient.get<Vehicle>(`/listings/${id}`)
    return data
  },

  createListing: async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await apiClient.post<Vehicle>('/listings', vehicle)
    return data
  },

  /**
   * Upload multipart d'une à N images d'annonce. Le back stocke dans le
   * bucket public et renvoie des URLs proxy `/listings/uploads/:key` — à
   * pousser telles quelles dans `images: string[]` du DTO createListing.
   */
  uploadImages: async (files: File[]): Promise<string[]> => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    const { data } = await apiClient.post<{ urls: string[] }>(
      '/listings/uploads/image',
      form,
    )
    return data.urls
  },

  updateListing: async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await apiClient.patch<Vehicle>(`/listings/${id}`, updates)
    return data
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/listings/${id}`)
  },

  getListingStats: async (): Promise<ListingStats> => {
    const { data } = await apiClient.get<ListingStats>('/listings/stats')
    return data
  },

  getListingFilterOptions: async (): Promise<ListingFilterOptions> => {
    const { data } = await apiClient.get<ListingFilterOptions>('/listings/filters')
    return data
  },
}
