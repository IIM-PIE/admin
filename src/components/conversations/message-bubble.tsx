import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import type { Message } from '@/types'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
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
            'rounded-lg px-4 py-2',
            isAdmin
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

