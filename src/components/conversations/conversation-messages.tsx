import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send } from 'lucide-react'
import { conversationsService } from '@/services/conversations.service'
import { MessageBubble } from './message-bubble'

interface ConversationMessagesProps {
  conversationId: string
  senderType?: 'admin' | 'user'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ConversationMessages({
  conversationId,
  senderType = 'admin',
  autoRefresh = true,
  refreshInterval = 5000,
}: ConversationMessagesProps) {
  const queryClient = useQueryClient()
  const [messageText, setMessageText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      conversationsService.sendMessage({
        conversationId,
        content,
        messageType: 'text',
        senderType,
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
      {/* Zone de messages - Prend tout l'espace disponible */}
      <ScrollArea className="flex-1 min-h-0 pr-4">
        <div className="space-y-4">
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

