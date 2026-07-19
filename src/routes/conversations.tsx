import { createFileRoute, redirect, useSearch, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { authService } from '@/services/auth.service'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { conversationsService } from '@/services/conversations.service'
import { ConversationList } from '@/components/conversations/conversation-list'
import { ConversationDetail } from '@/components/conversations/conversation-detail'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function ConversationsPage() {
  const search = useSearch({ from: '/conversations' })
  const navigate = useNavigate()
  // La searchParam `conversationId` est la source de vérité — pas de state
  // local dupliqué. Un state local re-forçait la sélection à chaque render
  // via un useEffect qui lisait l'URL, ce qui bloquait tout switch de conv
  // après une arrivée avec ?conversationId=X depuis /listings/:id.
  const selectedConversationId =
    (search as { conversationId?: string })?.conversationId ?? null
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [showList, setShowList] = useState(true)

  const setSelectedConversationId = (id: string | null) => {
    navigate({
      to: '/conversations',
      search: (prev) => ({ ...prev, conversationId: id ?? undefined }),
      replace: true,
    })
  }

  // Récupérer toutes les conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', { status: statusFilter === 'all' ? undefined : statusFilter }],
    queryFn: () => conversationsService.getConversations({
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  })

  // Filtrer et trier les conversations
  const filteredConversations = (conversations?.filter((conv) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.user?.name?.toLowerCase().includes(query) ||
      conv.user?.email?.toLowerCase().includes(query) ||
      conv.listing?.brand?.toLowerCase().includes(query) ||
      conv.listing?.model?.toLowerCase().includes(query) ||
      conv.vehicleDescription?.toLowerCase().includes(query)
    )
  }) || []).sort((a, b) => {
    // Trier par date du dernier message (ou date de mise à jour si pas de message)
    // Les conversations sans messages (lastMessageAt null) en bas
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0)
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0)
    return dateB - dateA // Plus récent en premier
  })

  // Conversation sélectionnée
  const selectedConversation = conversations?.find(c => c.id === selectedConversationId)

  // Si aucun conversationId dans l'URL et qu'on a des convs, on sélectionne
  // la 1re — mais UNIQUEMENT ce cas ; le switch entre convs passe par les
  // clics utilisateur, qui updatent l'URL via setSelectedConversationId.
  useEffect(() => {
    if (!selectedConversationId && filteredConversations.length > 0) {
      setSelectedConversationId(filteredConversations[0].id)
    }
  }, [filteredConversations, selectedConversationId])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
            <p className="text-muted-foreground">
              Fil tripartite entre le client, le concessionnaire et Strada.
            </p>
          </div>
        </div>

        <div className="relative h-[calc(100vh-12rem)]">
          <div className="flex h-full gap-4">
            {/* Colonne gauche - Liste des conversations */}
            {showList && (
              <div className="w-80 border-r pr-4 flex-shrink-0">
                <ConversationList
                  conversations={filteredConversations}
                  selectedId={selectedConversationId}
                  onSelect={setSelectedConversationId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Bouton toggle pour masquer/afficher la liste */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md"
              onClick={() => setShowList(!showList)}
            >
              {showList ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>

            {/* Zone de messages - Prend toute la largeur disponible */}
            <div className="flex-1 min-w-0">
              {selectedConversation ? (
                <ConversationDetail
                  conversation={selectedConversation}
                  onClose={() => setSelectedConversationId(null)}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Sélectionnez une conversation pour voir les détails</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/conversations')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      conversationId: (search.conversationId as string) || undefined,
    }
  },
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ConversationsPage,
})
