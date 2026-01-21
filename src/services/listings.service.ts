import apiClient from '@/lib/api-client'
import type { Vehicle, PaginationParams, VehicleStatus, FuelType, Transmission, PaginatedResponse } from '@/types'

interface ListingFilters extends PaginationParams {
  fuelType?: FuelType
  minPrice?: number
  maxPrice?: number
  minYear?: number
  maxYear?: number
  transmission?: Transmission
  status?: VehicleStatus | 'all'
}

export const listingsService = {
  getListings: async (params?: ListingFilters): Promise<Vehicle[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Vehicle>>('/listings', { params })
    return data.data
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
}
