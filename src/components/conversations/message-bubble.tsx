import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

// Transforme les URLs http(s) du texte en liens cliquables. Utile surtout
// pour les liens Stripe Checkout envoyés depuis le dialog "Réserver + lien
// Stripe" — l'admin veut pouvoir tester le lien d'un clic.
function renderMessageContent(text: string): React.ReactNode {
  const parts = text.split(/(https?:\/\/\S+)/g)
  return parts.map((part, i) =>
    part.startsWith('http') ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAdmin = message.senderType === 'admin'
  const sender = message.sender

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={cn(
        'flex gap-3',
        isAdmin ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        {sender?.avatarUrl ? (
          <img
            src={sender.avatarUrl}
            alt={sender.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <User className="h-4 w-4 text-primary" />
        )}
      </div>
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[70%]',
          isAdmin ? 'items-start' : 'items-end'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            {isAdmin ? 'Vous' : sender?.name || 'Client'}
          </span>
          <Badge variant="outline" className="text-xs">
            {isAdmin ? 'Admin' : 'Client'}
          </Badge>
        </div>
        <div
          className={cn(
            'rounded-lg px-4 py-2 max-w-full',
            isAdmin
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {/*
            `whitespace-pre-wrap` respecte les retours à la ligne du message.
            `break-words` + `[overflow-wrap:anywhere]` cassent les URLs longues
            (ex : liens Stripe Checkout de 200+ chars) pour qu'elles ne
            débordent pas de la bulle max-w-[70%].
          */}
          <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {renderMessageContent(message.content)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

