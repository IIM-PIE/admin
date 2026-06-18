import { io, Socket } from 'socket.io-client'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let chatSocket: Socket | null = null

/**
 * Singleton socket pour le namespace /chat.
 * Réutilise la même connexion entre les hooks/composants — chaque conversation
 * rejoint sa propre room via `conversation:join`.
 */
export function getChatSocket(): Socket {
  if (chatSocket && chatSocket.connected) return chatSocket

  const token = localStorage.getItem('access_token')

  chatSocket = io(`${baseURL}/chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
  })

  return chatSocket
}

export function disconnectChatSocket() {
  if (chatSocket) {
    chatSocket.removeAllListeners()
    chatSocket.disconnect()
    chatSocket = null
  }
}

/**
 * Recharge le token au prochain connect (à appeler après refresh JWT).
 */
export function refreshChatSocketAuth() {
  if (!chatSocket) return
  const token = localStorage.getItem('access_token')
  chatSocket.auth = { token }
  if (chatSocket.connected) {
    chatSocket.disconnect().connect()
  }
}
