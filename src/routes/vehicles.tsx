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
import { Search, Plus, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { vehiclesService } from '@/services/vehicles.service'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return <Badge variant="success">Disponible</Badge>
    case 'reserved':
      return <Badge variant="warning">Réservé</Badge>
    case 'sold':
      return <Badge variant="secondary">Vendu</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function VehiclesPage() {
  const queryClient = useQueryClient()

  const { data: vehicles, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesService.getVehicles(),
  })

  const deleteMutation = useMutation({
    mutationFn: vehiclesService.deleteVehicle,
    onSuccess: () => {
      toast.success('Véhicule supprimé avec succès')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    },
  })

  const availableCount = vehicles?.filter((v) => v.status === 'available').length || 0
  const reservedCount = vehicles?.filter((v) => v.status === 'reserved').length || 0
  const soldCount = vehicles?.filter((v) => v.status === 'sold').length || 0

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des véhicules</p>
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
            <h2 className="text-3xl font-bold tracking-tight">Véhicules</h2>
            <p className="text-muted-foreground">
              Gérez le catalogue de véhicules disponibles
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un véhicule
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vehicles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">véhicules</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableCount}</div>
              <p className="text-xs text-muted-foreground">en vente</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réservés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservedCount}</div>
              <p className="text-xs text-muted-foreground">en cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{soldCount}</div>
              <p className="text-xs text-muted-foreground">ce mois</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catalogue de véhicules</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${vehicles?.length || 0} véhicules au total`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par marque, modèle..."
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des véhicules...</p>
                </div>
              </div>
            ) : vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Coût import</TableHead>
                    <TableHead>Kilométrage</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.brand} {vehicle.model}
                      </TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>{vehicle.price.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="text-muted-foreground">
                        {vehicle.importCost.toLocaleString('fr-FR')} €
                      </TableCell>
                      <TableCell>{vehicle.mileage.toLocaleString('fr-FR')} km</TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                            <DropdownMenuItem>Changer le statut</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Supprimer ${vehicle.brand} ${vehicle.model} ?`)) {
                                  deleteMutation.mutate(vehicle.id)
                                }
                              }}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun véhicule trouvé</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez votre premier véhicule au catalogue
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/vehicles')({
  component: VehiclesPage,
})
