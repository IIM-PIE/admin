import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send } from 'lucide-react'
import { conversationsService } from '@/services/conversations.service'
import { useChatSocket } from '@/hooks/use-chat-socket'
import { MessageBubble } from './message-bubble'

interface ConversationMessagesProps {
  conversationId: string
  autoRefresh?: boolean
  /** Polling fallback en ms quand le socket n'est pas dispo. 0 = pas de polling. */
  refreshInterval?: number
  /** Active la souscription WebSocket pour temps réel (défaut: true). */
  useSocket?: boolean
}

export function ConversationMessages({
  conversationId,
  autoRefresh = true,
  refreshInterval = 15000,
  useSocket = true,
}: ConversationMessagesProps) {
  const queryClient = useQueryClient()
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Temps réel via WebSocket — le polling ci-dessous sert de fallback.
  useChatSocket({ conversationId, enabled: useSocket })

  // Récupérer les messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsService.getMessages(conversationId),
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  // Trier les messages par date croissante (plus ancien en haut, plus récent en bas)
  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mutation pour envoyer un message
  // senderType est dérivé du JWT côté back (rôle = 'admin' | 'user') — inutile de l'envoyer.
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationsService.sendMessage({
        conversationId,
        content,
        messageType: 'text',
      }),
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      // Invalider aussi les conversations de listing si elles existent
      queryClient.invalidateQueries({ queryKey: ['conversations', 'listing'] })
      toast.success('Message envoyé')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi')
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim()) return
    sendMessageMutation.mutate(messageText.trim())
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/*
        Zone de messages — comportement type chat (WhatsApp/iMessage) :
        - Les messages collent au BAS de la scroll area (justify-end).
        - Quand il n'y a qu'un ou deux messages, ils apparaissent en bas près
          de la barre d'envoi au lieu d'être en haut avec un énorme blanc.
        - Le `min-h-full` garantit que le container flex prend au moins la
          hauteur du scroll parent pour que justify-end ait un effet visible.
        - Quand le fil se remplit, la scrollbar prend le relais normalement.
      */}
      <ScrollArea className="flex-1 min-h-0 pr-4">
        <div className="flex flex-col justify-end space-y-4 min-h-full">
          {loadingMessages ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des messages...
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun message dans cette conversation
            </div>
          ) : (
            sortedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Formulaire d'envoi - Fixe en bas */}
      <Separator className="my-4 flex-shrink-0" />
      <form onSubmit={handleSendMessage} className="flex gap-2 flex-shrink-0">
        <Textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Tapez votre message..."
          className="min-h-[80px] resize-none"
          disabled={sendMessageMutation.isPending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage(e)
            }
          }}
        />
        <Button
          type="submit"
          disabled={!messageText.trim() || sendMessageMutation.isPending}
          size="icon"
          className="h-[80px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

