import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Eye, Check, X } from 'lucide-react'
import { quotesService } from '@/services/quotes.service'

const getStatusBadge = (status: string) => {
  const badges = {
    pending: <Badge variant="warning">En attente</Badge>,
    accepted: <Badge variant="success">Accepté</Badge>,
    rejected: <Badge variant="destructive">Refusé</Badge>,
    expired: <Badge variant="secondary">Expiré</Badge>,
  }
  return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
}

function QuotesPage() {
  const queryClient = useQueryClient()
  const { data: quotes, isLoading, error } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => quotesService.getQuotes(),
  })

  const acceptMutation = useMutation({
    mutationFn: quotesService.acceptQuote,
    onSuccess: () => {
      toast.success('Devis accepté')
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
  })

  const rejectMutation = useMutation({
    mutationFn: quotesService.rejectQuote,
    onSuccess: () => {
      toast.success('Devis refusé')
      queryClient.invalidateQueries({ queryKey: ['quotes'] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Erreur'),
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

  const totalValue = quotes?.reduce((sum, q) => sum + q.totalCost, 0) || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Devis</h2>
            <p className="text-muted-foreground">Gérez les devis d'importation</p>
          </div>
          <Button><Plus className="mr-2 h-4 w-4" />Créer un devis</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{quotes?.length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">En attente</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{quotes?.filter(q => q.status === 'pending').length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Acceptés</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{quotes?.filter(q => q.status === 'accepted').length || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Valeur totale</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{Math.round(totalValue / 1000)}k €</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des devis</CardTitle>
            <CardDescription>{isLoading ? 'Chargement...' : `${quotes?.length || 0} devis`}</CardDescription>
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
            ) : quotes && quotes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Prix véhicule</TableHead>
                    <TableHead>Coût import</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Validité</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.vehicleDescription}</TableCell>
                      <TableCell>{quote.vehiclePrice.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="text-muted-foreground">{quote.importCost.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell className="font-semibold">{quote.totalCost.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          {quote.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => acceptMutation.mutate(quote.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => rejectMutation.mutate(quote.id)}>
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
                <p className="text-muted-foreground">Aucun devis trouvé</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/quotes')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: QuotesPage,
})
