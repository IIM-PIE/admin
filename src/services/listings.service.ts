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
