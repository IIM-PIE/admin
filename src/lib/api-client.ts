import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

const resolvePending = (token: string | null) => {
  pendingRequests.forEach((callback) => callback(token))
  pendingRequests = []
}

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Si on envoie un FormData, supprimer le Content-Type par défaut
  // pour laisser axios gérer automatiquement le multipart/form-data avec la boundary
  if (config.data instanceof FormData) {
    // Supprimer le Content-Type pour laisser axios le gérer automatiquement
    if (config.headers) {
      delete (config.headers as any)['Content-Type']
    }
  }
  
  return config
})

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const originalRequest = error.config

    if (status === 401) {
      // Ne pas rediriger si on est sur la page de login (pour afficher l'erreur)
      const isLoginRequest = originalRequest?.url?.includes('/auth/login')
      const isRefreshRequest = originalRequest?.url?.includes('/auth/refresh')
      const refreshToken = localStorage.getItem('refresh_token')

      if (isLoginRequest || isRefreshRequest) {
        return Promise.reject(error)
      }

      if (!refreshToken) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await refreshClient.post('/auth/refresh', {
            refreshToken,
          })
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('refresh_token', data.refresh_token)
          resolvePending(data.access_token)
        } catch (refreshError) {
          resolvePending(null)
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return new Promise((resolve, reject) => {
        pendingRequests.push((token) => {
          if (!token || !originalRequest) {
            reject(error)
            return
          }
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${token}`,
          }
          resolve(apiClient(originalRequest))
        })
      })
    }
    return Promise.reject(error)
  }
)

export default apiClient
