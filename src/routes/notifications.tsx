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
import { Bell, Check, CheckCheck } from 'lucide-react'
import { notificationsService } from '@/services/notifications.service'

const getTypeColor = (type: string) => {
  const colors = {
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  }
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

const getTypeLabel = (type: string) => {
  const labels = {
    info: 'Info',
    success: 'Succès',
    warning: 'Attention',
    error: 'Erreur',
  }
  return labels[type as keyof typeof labels] || type
}

function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getNotifications(),
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(),
  })

  const markAsReadMutation = useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      toast.success('Toutes les notifications ont été marquées comme lues')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des notifications</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">
              Gérez les notifications système
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={!notifications || notifications.length === 0 || unreadCount === 0}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Tout marquer comme lu
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications?.length || 0}</div>
              <p className="text-xs text-muted-foreground">notifications</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non lues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount || 0}</div>
              <p className="text-xs text-muted-foreground">nécessitent attention</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Centre de notifications</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${notifications?.length || 0} notifications`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des notifications...</p>
                </div>
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      !notification.isRead ? 'bg-muted/50 border-primary/20' : ''
                    }`}
                  >
                    <div
                      className={`rounded-full p-2 ${getTypeColor(notification.type)}`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {notification.title}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {!notification.isRead && (
                          <Badge variant="warning" className="text-xs">
                            Nouveau
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Aucune notification</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous êtes à jour !
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/notifications')({
  component: NotificationsPage,
})
