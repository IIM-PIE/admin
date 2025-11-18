import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Car, FileText, Package } from 'lucide-react'
import { usersService } from '@/services/users.service'
import { vehiclesService } from '@/services/vehicles.service'
import { quotesService } from '@/services/quotes.service'
import { importsService } from '@/services/imports.service'

function DashboardPage() {
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  })

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesService.getVehicles(),
  })

  const { data: quotes, isLoading: loadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesService.getQuotes(),
  })

  const { data: imports, isLoading: loadingImports } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsService.getImports(),
  })

  const pendingQuotes = quotes?.filter(q => q.status === 'pending').length || 0
  const activeImports = imports?.filter(i => i.status === 'in_progress').length || 0
  const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0

  const recentImports = imports?.slice(0, 5) || []

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge variant="secondary">En attente</Badge>,
      in_progress: <Badge variant="warning">En cours</Badge>,
      completed: <Badge variant="success">Terminé</Badge>,
      cancelled: <Badge variant="destructive">Annulé</Badge>,
    }
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
  }

  const stats = [
    {
      title: 'Total Utilisateurs',
      value: loadingUsers ? '...' : (users?.length || 0).toString(),
      description: 'utilisateurs enregistrés',
      icon: Users,
    },
    {
      title: 'Véhicules disponibles',
      value: loadingVehicles ? '...' : availableVehicles.toString(),
      description: `${vehicles?.length || 0} véhicules au total`,
      icon: Car,
    },
    {
      title: 'Devis en attente',
      value: loadingQuotes ? '...' : pendingQuotes.toString(),
      description: `${quotes?.length || 0} devis au total`,
      icon: FileText,
    },
    {
      title: 'Importations actives',
      value: loadingImports ? '...' : activeImports.toString(),
      description: `${imports?.length || 0} importations au total`,
      icon: Package,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre plateforme d'importation
          </p>
        </div> */}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Importations récentes</CardTitle>
              <CardDescription>
                {loadingImports ? 'Chargement...' : `${recentImports.length} importations récentes`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingImports ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentImports.length > 0 ? (
                <div className="space-y-4">
                  {recentImports.map((importItem) => (
                    <div key={importItem.id} className="flex items-center">
                      <div className="ml-4 space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {importItem.vehicleDescription}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Étape {importItem.currentStep}/5
                        </p>
                      </div>
                      <div className="text-sm">
                        {getStatusBadge(importItem.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Aucune importation récente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Résumé des données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{users?.length || 0} utilisateurs enregistrés</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{vehicles?.length || 0} véhicules au catalogue</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{pendingQuotes} devis en attente</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{activeImports} importations actives</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{quotes?.filter(q => q.status === 'accepted').length || 0} devis acceptés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/')({
  component: DashboardPage,
})
