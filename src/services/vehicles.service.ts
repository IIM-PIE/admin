import apiClient from '@/lib/api-client'
import type { Vehicle, PaginationParams, VehicleStatus, FuelType, Transmission, PaginatedResponse } from '@/types'

interface VehicleFilters extends PaginationParams {
  fuelType?: FuelType
  minPrice?: number
  maxPrice?: number
  minYear?: number
  maxYear?: number
  transmission?: Transmission
  status?: VehicleStatus
}

export const vehiclesService = {
  getVehicles: async (params?: VehicleFilters): Promise<Vehicle[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Vehicle>>('/vehicles', { params })
    return data.data
  },

  getVehicle: async (id: string): Promise<Vehicle> => {
    const { data } = await apiClient.get<Vehicle>(`/vehicles/${id}`)
    return data
  },

  createVehicle: async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await apiClient.post<Vehicle>('/vehicles', vehicle)
    return data
  },

  updateVehicle: async (id: string, updates: Partial<Vehicle>): Promise<Vehicle> => {
    const { data } = await apiClient.patch<Vehicle>(`/vehicles/${id}`, updates)
    return data
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`)
  },
}
