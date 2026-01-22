import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ScrollArea,
} from '@/components/ui/scroll-area'
import { Search, MessageSquare, User } from 'lucide-react'
import { conversationsService } from '@/services/conversations.service'
import type { Conversation } from '@/types'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: 'all' | 'active' | 'closed'
  onStatusFilterChange: (filter: 'all' | 'active' | 'closed') => void
  isLoading: boolean
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isLoading,
}: ConversationListProps) {
  const queryClient = useQueryClient()

  // Marquer comme lu quand on sélectionne
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => conversationsService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSelect = (id: string) => {
    onSelect(id)
    const conv = conversations.find(c => c.id === id)
    if (conv && conv.unreadCount > 0) {
      markAsReadMutation.mutate(id)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec recherche et filtres */}
      <div className="space-y-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'closed') => onStatusFilterChange(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="active">Actives</SelectItem>
            <SelectItem value="closed">Fermées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste des conversations */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement...
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune conversation trouvée</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const listing = conversation.listing
              const user = conversation.user
              const isSelected = conversation.id === selectedId
              const hasUnread = conversation.unreadCount > 0

              return (
                <div
                  key={conversation.id}
                  onClick={() => handleSelect(conversation.id)}
                  className={cn(
                    'p-4 rounded-lg border cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50',
                    hasUnread && !isSelected && 'bg-muted/30 border-primary/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {user?.name || 'Client inconnu'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    {hasUnread && (
                      <Badge variant="warning" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>

                  {/* Détails de l'annonce */}
                  {listing ? (
                    <div className="mb-2 p-2 bg-muted/50 rounded text-xs">
                      <p className="font-medium truncate">
                        {listing.brand} {listing.model} ({listing.year})
                      </p>
                      <p className="text-muted-foreground">
                        {listing.price.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                  ) : conversation.vehicleDescription ? (
                    <div className="mb-2 p-2 bg-muted/50 rounded text-xs">
                      <p className="text-muted-foreground truncate">
                        {conversation.vehicleDescription}
                      </p>
                    </div>
                  ) : null}

                  {/* Statut et date */}
                  <div className="flex items-center justify-between mt-2">
                    <Badge
                      variant={conversation.status === 'active' ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {conversation.status === 'active' ? 'Active' : 'Fermée'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(conversation.lastMessageAt || conversation.updatedAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

