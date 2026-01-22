import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  ExternalLink, 
  User,
  Car,
  DollarSign
} from 'lucide-react'
import type { Conversation } from '@/types'
import { ConversationMessages } from './conversation-messages'

interface ConversationDetailProps {
  conversation: Conversation
  onClose?: () => void
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const navigate = useNavigate()

  const handleGoToListing = () => {
    if (conversation.listingId) {
      navigate({ to: '/listings' })
    }
  }

  const listing = conversation.listing
  const user = conversation.user

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="flex items-center justify-between pb-4 border-b flex-shrink-0">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
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
            <div>
              <h2 className="font-semibold">{user?.name || 'Client inconnu'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>
        <Badge
          variant={conversation.status === 'active' ? 'success' : 'secondary'}
        >
          {conversation.status === 'active' ? 'Active' : 'Fermée'}
        </Badge>
      </div>

      {/* Card annonce */}
      {listing && (
        <Card className="mt-4 flex-shrink-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Annonce liée</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToListing}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir l'annonce
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {listing.brand} {listing.model}
                  </p>
                  <p className="text-xs text-muted-foreground">Année {listing.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {listing.price.toLocaleString('fr-FR')} €
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {listing.importCost ? `+ ${listing.importCost.toLocaleString('fr-FR')} € import` : ''}
                  </p>
                </div>
              </div>
              {listing.images && listing.images.length > 0 && (
                <div className="col-span-2">
                  <img
                    src={listing.images[0]}
                    alt={`${listing.brand} ${listing.model}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone de messages - Prend tout l'espace disponible */}
      <div className="flex-1 mt-4 min-h-0">
        <ConversationMessages conversationId={conversation.id} />
      </div>
    </div>
  )
}

