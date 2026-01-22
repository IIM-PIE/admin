import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { listingsService } from '@/services/listings.service'

function ReservationsPage() {
  const { data: listingsResponse, isLoading, error } = useQuery({
    queryKey: ['listings', { status: 'reserved' }],
    queryFn: () => listingsService.getListings({ status: 'reserved', page: 1, limit: 1000 }),
  })

  const reservedListings = listingsResponse?.data || []

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-destructive">Erreur de chargement</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Liste des annonces réservées</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${reservedListings.length} annonces`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reservedListings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Annonce</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Kilométrage</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservedListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/reservations/$id"
                          params={{ id: listing.id }}
                          className="hover:underline"
                        >
                          {listing.brand} {listing.model} · {listing.year}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">Réservé</Badge>
                      </TableCell>
                      <TableCell>{listing.price.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{listing.mileage.toLocaleString('fr-FR')} km</TableCell>
                      <TableCell>{listing.location}</TableCell>
                      <TableCell>{listing.seller?.name || '—'}</TableCell>
                      <TableCell>
                        {listing.reservedByUser?.name || listing.reservedByUser?.email || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune annonce réservée</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/reservations/')({
  component: ReservationsPage,
})
