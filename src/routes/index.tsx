import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Car, Store } from 'lucide-react'
import { usersService } from '@/services/users.service'
import { listingsService } from '@/services/listings.service'
import { sellersService } from '@/services/sellers.service'
import { authService } from '@/services/auth.service'

function DashboardPage() {
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', { page: 1, limit: 1000 }],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  })

  const { data: listingsResponse, isLoading: loadingVehicles } = useQuery({
    queryKey: ['listings', { page: 1, limit: 5 }],
    queryFn: () => listingsService.getListings({ page: 1, limit: 5, status: 'all' }),
  })

  const { data: listingStats, isLoading: loadingListingStats } = useQuery({
    queryKey: ['listings', 'stats'],
    queryFn: () => listingsService.getListingStats(),
  })

  const vehicles = listingsResponse?.data || []
  const totalListings = listingStats?.total ?? listingsResponse?.meta?.total ?? vehicles.length

  const { data: sellers, isLoading: loadingSellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => sellersService.getSellers({ page: 1, limit: 1000 }),
  })

  const availableVehicles = listingStats?.available ?? 0
  const reservedVehicles = listingStats?.reserved ?? 0
  const soldVehicles = listingStats?.sold ?? 0
  const totalListingsDisplay = loadingListingStats ? '...' : totalListings.toString()
  const availableVehiclesDisplay = loadingListingStats ? '...' : availableVehicles.toString()

  const recentVehicles = vehicles || []

  const getVehicleStatusBadge = (status: string) => {
    const badges = {
      available: <Badge variant="success">Disponible</Badge>,
      reserved: <Badge variant="warning">Réservé</Badge>,
      sold: <Badge variant="secondary">Vendu</Badge>,
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
      title: 'Vendeurs',
      value: loadingSellers ? '...' : (sellers?.length || 0).toString(),
      description: 'vendeurs enregistrés',
      icon: Store,
    },
    {
      title: 'Annonces disponibles',
      value: availableVehiclesDisplay,
      description: `${totalListingsDisplay} annonces au total`,
      icon: Car,
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <CardTitle>Annonces récents</CardTitle>
              <CardDescription>
                {loadingVehicles ? 'Chargement...' : `${recentVehicles.length} annonces récentes`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingVehicles ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : recentVehicles.length > 0 ? (
                <div className="space-y-4">
                  {recentVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center">
                      <div className="ml-4 space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.year} · {vehicle.mileage.toLocaleString('fr-FR')} km
                        </p>
                      </div>
                      <div className="text-sm">
                        {getVehicleStatusBadge(vehicle.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Aucune annonce récente</p>
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
                  <p className="text-sm">{sellers?.length || 0} vendeurs enregistrés</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{vehicles?.length || 0} annonces au catalogue</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{availableVehicles} annonces disponibles</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{reservedVehicles} annonces réservées</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm">{soldVehicles} annonces vendues</p>
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
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/listings' })
    }
  },
  component: DashboardPage,
})
