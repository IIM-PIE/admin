import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  ExternalLink,
  User,
  Car,
  Wallet,
  FileText,
  FileDown,
  CreditCard,
} from 'lucide-react'
import type { Conversation } from '@/types'
import { ConversationMessages } from './conversation-messages'
import { ListingDocuments } from '@/components/listings/listing-documents'
import { GenerateQuoteDialog } from '@/components/quotes/generate-quote-dialog'
import { ReservationWorkflowTimeline } from '@/components/reservations/reservation-workflow-timeline'
import { ReserveForClientDialog } from '@/components/reservations/reserve-for-client-dialog'
import { reservationsService } from '@/services/reservations.service'

interface ConversationDetailProps {
  conversation: Conversation
  onClose?: () => void
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const navigate = useNavigate()
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false)

  const handleGoToListing = () => {
    if (!conversation.listingId) return
    navigate({
      to: '/listings/$id',
      params: { id: conversation.listingId },
    })
  }

  const listing = conversation.listing
  const user = conversation.user

  // Réservation liée à cette conv — pour la timeline compacte dans la sidebar.
  // On préfère un lookup direct par reservationId si dispo, sinon fallback sur
  // "1re Reservation active du listing" (couvre la période transitoire où le
  // back n'expose pas encore reservationId sur toutes les convs).
  const { data: allReservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsService.getAll,
    enabled: !!listing?.id,
  })
  const linkedReservation = useMemo(() => {
    if (!allReservations?.length) return null
    if (conversation.reservationId) {
      return allReservations.find((r) => r.id === conversation.reservationId) ?? null
    }
    if (!listing?.id) return null
    return (
      allReservations.find(
        (r) =>
          r.vehicleId === listing.id &&
          (r.status === 'pending_payment' || r.status === 'confirmed'),
      ) ?? null
    )
  }, [allReservations, conversation.reservationId, listing?.id])

  return (
    <div className="flex flex-col h-full">
      {/* Header — nom user + status + actions */}
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

      {/*
        Corps de la conv :
        - Grille 2 colonnes sur desktop (thread flex-1, sidebar 320px)
        - Empilé verticalement en dessous de lg (< 1024px)
        - Sidebar contient 2 blocs empilés : Infos annonce + Documents
        - min-h-0 sur les enfants pour que le scrollbar interne du thread fonctionne
      */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mt-4">
        {/* Zone thread messages */}
        <div className="min-h-0 flex flex-col">
          <ConversationMessages conversationId={conversation.id} />
        </div>

        {/* Sidebar droite : workflow + annonce + documents (scrollable indépendamment) */}
        <aside className="min-h-0 overflow-y-auto space-y-4 pr-1">
          {linkedReservation && (
            <ReservationWorkflowTimeline
              reservation={linkedReservation}
              vehicle={listing ? { id: listing.id, status: listing.status } : null}
              compact
            />
          )}

          {listing ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Annonce liée
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGoToListing}
                    title="Voir la fiche complète"
                    className="h-8"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {listing.images && listing.images.length > 0 && (
                  <img
                    src={listing.images[0]}
                    alt={`${listing.brand} ${listing.model}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {listing.brand} {listing.model}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Année {listing.year}
                  </p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">
                      {listing.price.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  {listing.importCost && (
                    <span className="text-xs text-muted-foreground">
                      + {listing.importCost.toLocaleString('fr-FR')} € import
                    </span>
                  )}
                </div>
                {/* Actions rapides pour le client de la conv (userId déjà dispo). */}
                {user && (
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => setQuoteDialogOpen(true)}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-2" />
                      Générer un devis
                    </Button>
                    {(listing?.status === 'available' ||
                      linkedReservation?.status === 'pending_payment') && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => setReserveDialogOpen(true)}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-2" />
                        {linkedReservation?.status === 'pending_payment'
                          ? 'Générer le lien Stripe'
                          : 'Réserver + lien Stripe'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">
                  Aucune annonce liée
                </CardTitle>
              </CardHeader>
            </Card>
          )}

          {/*
            Deux sections empilées :
              1. 📋 Docs de l'annonce (partagés entre toutes les convs sur ce listing)
              2. 💬 Justificatifs échangés (privés à CETTE conv, ne fuitent pas)
            Sémantique définie côté back dans PR #77 (Document.conversationId).
          */}
          {conversation.listingId ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
                <FileText className="h-4 w-4" />
                <span>Docs de l'annonce</span>
              </div>
              <p className="text-[10px] text-muted-foreground px-1">
                Documents officiels de l'annonce (fournis par Strada).
              </p>
              <ListingDocuments
                listingId={conversation.listingId}
                vehicleStatus={listing?.status}
                compact
                categoryFilter="admin_provided"
              />
            </div>
          ) : null}

          {/* Justificatifs privés à cette conversation. Utilise le même composant
              en mode "conversationId" : fetch et upload passent tous les 2 par
              conversationId côté back. */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
              <FileText className="h-4 w-4" />
              <span>Justificatifs échangés</span>
            </div>
            <p className="text-[10px] text-muted-foreground px-1">
              Privés à ce chat — ne sont pas visibles depuis d'autres convs.
            </p>
            <ListingDocuments
              listingId={conversation.listingId ?? ''}
              conversationId={conversation.id}
              compact
            />
          </div>
        </aside>
      </div>

      {/* Modal génération devis — client cible = user de la conv, pré-sélectionné. */}
      {listing && user && (
        <GenerateQuoteDialog
          open={quoteDialogOpen}
          onOpenChange={setQuoteDialogOpen}
          vehicle={{ id: listing.id, brand: listing.brand, model: listing.model }}
          preselectedUser={{
            id: user.id,
            name: user.name,
            email: user.email,
          }}
        />
      )}

      {/* Modal "Réserver + lien Stripe" — client cible pré-sélectionné, envoi
          direct du message dans cette même conv. Réutilise la résa liée si
          elle est déjà en `pending_payment`. */}
      {listing && user && (
        <ReserveForClientDialog
          open={reserveDialogOpen}
          onOpenChange={setReserveDialogOpen}
          vehicle={{
            id: listing.id,
            brand: listing.brand,
            model: listing.model,
            year: listing.year,
            price: listing.price,
          }}
          preselectedUser={{
            id: user.id,
            name: user.name,
            email: user.email,
          }}
          existingReservationId={
            linkedReservation?.status === 'pending_payment'
              ? linkedReservation.id
              : null
          }
        />
      )}
    </div>
  )
}
