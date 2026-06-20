import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getChatSocket } from '@/lib/socket'

interface UseChatSocketOptions {
  conversationId: string | undefined
  enabled?: boolean
}

/**
 * Rejoint la room WebSocket d'une conversation et patche le cache TanStack
 * Query à chaque nouveau message reçu.
 *
 * Remplace le polling 5s actuel lorsque la connexion socket est établie.
 * Si le socket coupe (réseau, env sans WS), le `refetchInterval` du composant
 * <ConversationMessages> reste en backup.
 */
export function useChatSocket({ conversationId, enabled = true }: UseChatSocketOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !conversationId) return

    const socket = getChatSocket()

    const handleConnect = () => {
      socket.emit('conversation:join', { conversationId })
    }

    const handleNewMessage = (message: any) => {
      if (!message || message.conversationId !== conversationId) return

      queryClient.setQueryData<any[]>(['messages', conversationId], (prev) => {
        const list = prev ?? []
        if (list.some((m) => m.id === message.id)) return list
        return [...list, message]
      })

      // Invalide la liste des conversations pour rafraîchir unreadCount/lastMessageAt
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversations', 'listing'] })
    }

    const handleConversationUpdated = (payload: any) => {
      if (!payload || payload.conversationId !== conversationId) return
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    if (socket.connected) {
      socket.emit('conversation:join', { conversationId })
    } else {
      socket.once('connect', handleConnect)
    }

    socket.on('message:new', handleNewMessage)
    socket.on('conversation:updated', handleConversationUpdated)

    return () => {
      socket.emit('conversation:leave', { conversationId })
      socket.off('connect', handleConnect)
      socket.off('message:new', handleNewMessage)
      socket.off('conversation:updated', handleConversationUpdated)
    }
  }, [conversationId, enabled, queryClient])
}
