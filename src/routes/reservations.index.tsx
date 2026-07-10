import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { reservationsService } from '@/services/reservations.service'
import type { PaymentStatus, ReservationStatus } from '@/types'

const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

// success -> vert, warning -> orange (couleur de vigilance), secondary -> gris, destructive -> rouge
const reservationStatusBadge = (status: ReservationStatus) => {
  const variant: 'success' | 'warning' | 'secondary' | 'destructive' =
    status === 'confirmed' ? 'success'
    : status === 'pending_payment' ? 'warning'
    : 'secondary'
  return <Badge variant={variant}>{RESERVATION_STATUS_LABEL[status]}</Badge>
}

const paymentStatusBadge = (status?: PaymentStatus) => {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  const label: Record<PaymentStatus, string> = {
    pending: 'En cours',
    succeeded: 'Réussi',
    failed: 'Échec',
    cancelled: 'Annulé',
  }
  const variant: 'success' | 'warning' | 'destructive' | 'secondary' =
    status === 'succeeded' ? 'success'
    : status === 'pending' ? 'warning'
    : status === 'failed' ? 'destructive'
    : 'secondary'
  return <Badge variant={variant}>{label[status]}</Badge>
}

function formatCurrency(value?: string | number | null): string {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '—'
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ReservationsPage() {
  const { data: reservations = [], isLoading, error } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsService.getAll,
  })

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending_payment').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-destructive">Erreur de chargement des réservations</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cartes stats en tête */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{isLoading ? '…' : stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>En attente paiement</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{isLoading ? '…' : stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Confirmées</CardDescription>
              <CardTitle className="text-3xl text-green-600">{isLoading ? '…' : stats.confirmed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Annulées</CardDescription>
              <CardTitle className="text-3xl text-muted-foreground">{isLoading ? '…' : stats.cancelled}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Liste principale */}
        <Card>
          <CardHeader>
            <CardTitle>Réservations</CardTitle>
            <CardDescription>
              Toutes les réservations, tous statuts confondus — dont celles en attente de paiement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reservations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Caution</TableHead>
                    <TableHead>Statut réservation</TableHead>
                    <TableHead>Dernier paiement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r) => {
                    const lastPayment = r.payments?.[0]
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{r.user?.name || '—'}</span>
                            <span className="text-xs text-muted-foreground">{r.user?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.vehicle ? (
                            <Link
                              to="/reservations/$id"
                              params={{ id: r.vehicle.id }}
                              className="hover:underline"
                            >
                              {r.vehicle.brand} {r.vehicle.model} · {r.vehicle.year}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(r.depositAmount)}</TableCell>
                        <TableCell>{reservationStatusBadge(r.status)}</TableCell>
                        <TableCell>{paymentStatusBadge(lastPayment?.status)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune réservation</p>
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
