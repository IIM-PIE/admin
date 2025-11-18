import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Eye } from 'lucide-react'
import { importsService } from '@/services/imports.service'

const getStatusBadge = (status: string) => {
  const badges = {
    pending: <Badge variant="secondary">En attente</Badge>,
    in_progress: <Badge variant="warning">En cours</Badge>,
    completed: <Badge variant="success">Terminé</Badge>,
    cancelled: <Badge variant="destructive">Annulé</Badge>,
  }
  return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
}

function ImportsPage() {
  const { data: imports, isLoading, error } = useQuery({
    queryKey: ['imports'],
    queryFn: () => importsService.getImports(),
  })

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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Importations</h2>
            <p className="text-muted-foreground">Suivez toutes les importations</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{imports?.length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">En cours</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{imports?.filter(i => i.status === 'in_progress').length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Terminées</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{imports?.filter(i => i.status === 'completed').length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Livraisons prévues</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">
              {imports?.filter(i => i.estimatedDelivery && new Date(i.estimatedDelivery) > new Date()).length || 0}
            </div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des importations</CardTitle>
            <CardDescription>{isLoading ? 'Chargement...' : `${imports?.length || 0} importations`}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-8" />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : imports && imports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Livraison estimée</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((importItem) => {
                    const totalSteps = 5 // Default total steps
                    const progress = (importItem.currentStep / totalSteps) * 100

                    return (
                      <TableRow key={importItem.id}>
                        <TableCell className="font-medium">{importItem.vehicleDescription}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm">Étape {importItem.currentStep}/{totalSteps}</div>
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(importItem.status)}</TableCell>
                        <TableCell>
                          {importItem.estimatedDelivery
                            ? new Date(importItem.estimatedDelivery).toLocaleDateString('fr-FR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(importItem.createdAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm"><Eye className="mr-2 h-4 w-4" />Détails</Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune importation trouvée</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/imports')({
  component: ImportsPage,
})
