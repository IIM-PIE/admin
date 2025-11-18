import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ExternalLink, Eye, Check, X } from 'lucide-react'
import { externalListingsService } from '@/services/external-listings.service'

const getStatusBadge = (status: string) => {
  const badges = {
    pending: <Badge variant="warning">En attente</Badge>,
    analyzing: <Badge variant="secondary">Analyse</Badge>,
    quoted: <Badge variant="success">Devis envoyé</Badge>,
    rejected: <Badge variant="destructive">Rejeté</Badge>,
  }
  return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
}

function ExternalListingsPage() {
  const { data: listings, isLoading, error } = useQuery({
    queryKey: ['external-listings'],
    queryFn: () => externalListingsService.getExternalListings(),
  })

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des annonces</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const pendingCount = listings?.filter((l) => l.status === 'pending').length || 0
  const quotedCount = listings?.filter((l) => l.status === 'quoted').length || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Listings externes</h2>
            <p className="text-muted-foreground">
              Gérez les annonces soumises par les clients
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{listings?.length || 0}</div>
              <p className="text-xs text-muted-foreground">annonces soumises</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">à examiner</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Devis envoyés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quotedCount}</div>
              <p className="text-xs text-muted-foreground">avec devis</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Annonces externes</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${listings?.length || 0} annonces soumises par les clients`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une annonce..."
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des annonces...</p>
                </div>
              </div>
            ) : listings && listings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <span className="max-w-[200px] truncate">
                            {listing.url}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {listing.price
                          ? `${listing.price.toLocaleString('fr-FR')} €`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {listing.location || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {listing.sellerName || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(listing.createdAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {listing.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune annonce externe</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les annonces soumises par les clients apparaîtront ici
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/external-listings')({
  component: ExternalListingsPage,
})
