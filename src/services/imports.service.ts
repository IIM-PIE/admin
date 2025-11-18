import apiClient from '@/lib/api-client'
import type { Import, ImportStep, PaginationParams, PaginatedResponse } from '@/types'

interface ImportFilters extends PaginationParams {
  userId?: string
  status?: string
}

export const importsService = {
  getImports: async (params?: ImportFilters): Promise<Import[]> => {
    const { data } = await apiClient.get<PaginatedResponse<Import>>('/imports', { params })
    return data.data
  },

  getImport: async (id: string): Promise<Import> => {
    const { data } = await apiClient.get<Import>(`/imports/${id}`)
    return data
  },

  createImport: async (importData: Partial<Import>): Promise<Import> => {
    const { data } = await apiClient.post<Import>('/imports', importData)
    return data
  },

  updateImport: async (id: string, updates: Partial<Import>): Promise<Import> => {
    const { data } = await apiClient.patch<Import>(`/imports/${id}`, updates)
    return data
  },

  deleteImport: async (id: string): Promise<void> => {
    await apiClient.delete(`/imports/${id}`)
  },

  // Import Steps
  getSteps: async (importId: string): Promise<ImportStep[]> => {
    const { data } = await apiClient.get<ImportStep[]>('/import-steps', {
      params: { importId },
    })
    return data
  },

  createStep: async (step: Partial<ImportStep>): Promise<ImportStep> => {
    const { data } = await apiClient.post<ImportStep>('/import-steps', step)
    return data
  },

  updateStep: async (id: string, updates: Partial<ImportStep>): Promise<ImportStep> => {
    const { data } = await apiClient.patch<ImportStep>(`/import-steps/${id}`, updates)
    return data
  },

  updateStepStatus: async (
    id: string,
    status: 'pending' | 'active' | 'completed',
    details?: string
  ): Promise<ImportStep> => {
    const { data } = await apiClient.patch<ImportStep>(`/import-steps/${id}/status`, {
      status,
      details,
    })
    return data
  },

  deleteStep: async (id: string): Promise<void> => {
    await apiClient.delete(`/import-steps/${id}`)
  },
}
