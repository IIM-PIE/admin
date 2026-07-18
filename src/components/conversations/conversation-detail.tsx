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
} from 'lucide-react'
import type { Conversation } from '@/types'
import { ConversationMessages } from './conversation-messages'
import { ListingDocuments } from '@/components/listings/listing-documents'
import { GenerateQuoteDialog } from '@/components/quotes/generate-quote-dialog'
import { OrderWorkflowTimeline } from '@/components/orders/order-workflow-timeline'
import { ordersService, ORDER_STATUS_LABELS } from '@/services/orders.service'

interface ConversationDetailProps {
  conversation: Conversation
  onClose?: () => void
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const navigate = useNavigate()
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)

  const handleGoToListing = () => {
    if (!conversation.listingId) return
    navigate({
      to: '/listings/$id',
      params: { id: conversation.listingId },
    })
  }

  const listing = conversation.listing
  const user = conversation.user

  // Commande liée à cette conv — on cherche l'Order où le client de la conv
  // et le véhicule matchent. Le back ne propose pas de filtre par vehicleId,
  // donc on scope par userId (déjà petit set côté client) puis on matche le
  // véhicule côté front. Sans user ou listing, pas de fetch.
  const { data: userOrders } = useQuery({
    queryKey: ['orders', 'by-user', user?.id],
    queryFn: () => ordersService.list({ userId: user!.id, limit: 20 }),
    enabled: !!user?.id && !!listing?.id,
  })
  const linkedOrder = useMemo(() => {
    if (!userOrders?.data?.length || !listing?.id) return null
    // Priorité aux orders non-annulées ; sinon on prend la plus récente qui matche.
    const matches = userOrders.data.filter((o) => o.vehicle?.id === listing.id)
    return (
      matches.find((o) => o.status !== 'cancelled') ??
      matches[0] ??
      null
    )
  }, [userOrders, listing?.id])

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

        {/* Sidebar droite : commande liée (v2) + annonce + documents (scrollable indépendamment) */}
        <aside className="min-h-0 overflow-y-auto space-y-4 pr-1">
          {linkedOrder && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Commande liée
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: '/orders/$id',
                        params: { id: linkedOrder.id },
                      })
                    }
                    title="Ouvrir la commande"
                    className="h-8"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {linkedOrder.orderNumber}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {ORDER_STATUS_LABELS[linkedOrder.status]}
                  </Badge>
                </div>
                <OrderWorkflowTimeline status={linkedOrder.status} compact />
              </CardContent>
            </Card>
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
                {/*
                  Actions rapides — en workflow v2, le lien Stripe pour
                  l'acompte est initié depuis l'app mobile côté client, plus
                  depuis un dialog admin. Seul "Générer un devis" reste
                  pertinent ici.
                */}
                {user && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setQuoteDialogOpen(true)}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-2" />
                    Générer un devis
                  </Button>
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

    </div>
  )
}
