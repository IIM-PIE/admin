import apiClient from '@/lib/api-client'
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types'

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    // Stocker les tokens
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', userData)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  registerUserOnly: async (userData: RegisterData): Promise<User> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', userData)
    return data.user
  },

  logout: async (): Promise<void> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken })
      }
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const refreshToken = localStorage.getItem('refresh_token')
    const { data } = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token')
  },
}
