import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare } from 'lucide-react'
import { conversationsService } from '@/services/conversations.service'

function ConversationsPage() {
  const queryClient = useQueryClient()

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => conversationsService.getConversations(),
  })

  const markAsReadMutation = useMutation({
    mutationFn: conversationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des conversations</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const unreadCount = conversations?.filter((c) => !c.isRead).length || 0
  const totalMessages = conversations?.reduce((sum, c) => sum + (c.messageCount || 0), 0) || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
            <p className="text-muted-foreground">
              Gérez les conversations avec les clients
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversations?.length || 0}</div>
              <p className="text-xs text-muted-foreground">conversations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non lues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
              <p className="text-xs text-muted-foreground">nécessitent attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMessages}</div>
              <p className="text-xs text-muted-foreground">messages au total</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des conversations</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${conversations?.length || 0} conversations`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une conversation..."
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des conversations...</p>
                </div>
              </div>
            ) : conversations && conversations.length > 0 ? (
              <div className="space-y-4">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      !conversation.isRead ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {conversation.subject || 'Sans sujet'}
                        </p>
                        {!conversation.isRead && (
                          <Badge variant="warning">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conversation.messageCount || 0} message{(conversation.messageCount || 0) > 1 ? 's' : ''}
                        {' • '}
                        {conversation.lastMessageAt
                          ? new Date(conversation.lastMessageAt).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!conversation.isRead) {
                            markAsReadMutation.mutate(conversation.id)
                          }
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Voir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les conversations avec les clients apparaîtront ici
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/conversations')({
  component: ConversationsPage,
})
