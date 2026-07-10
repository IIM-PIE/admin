import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { reservationsService } from '@/services/reservations.service'
import { listingsService } from '@/services/listings.service'
import type { PaymentStatus, Reservation, ReservationStatus, Vehicle } from '@/types'

const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
}

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

/**
 * Ligne unifiée affichée dans le tableau — synthèse des deux sources :
 * - Reservation (POST /reservations, workflow customer + Stripe)
 * - Vehicle.status='reserved' (PATCH admin manuel, ancien workflow)
 *
 * `source` permet à l'UI de badger la provenance pour clarifier au user
 * pourquoi une voiture apparaît ici et où elle vient.
 */
type UnifiedRow =
  | {
      source: 'stripe'
      key: string
      date: string
      user?: { name?: string; email?: string }
      vehicle?: Reservation['vehicle']
      depositAmount?: string
      reservationStatus: ReservationStatus
      lastPaymentStatus?: PaymentStatus
    }
  | {
      source: 'manual'
      key: string
      date: string
      user?: { name?: string; email?: string }
      vehicle: Vehicle
    }

function ReservationsPage() {
  // Deux fetch parallèles :
  //   1. GET /reservations           → source Stripe (workflow customer)
  //   2. GET /listings?status=reserved → source "réservé à la main" (workflow admin)
  const {
    data: reservations = [],
    isLoading: loadingRes,
    error: errorRes,
  } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsService.getAll,
  })

  const {
    data: reservedListings,
    isLoading: loadingListings,
    error: errorListings,
  } = useQuery({
    queryKey: ['listings', { status: 'reserved' }],
    queryFn: () => listingsService.getListings({ status: 'reserved', page: 1, limit: 1000 }),
  })

  const isLoading = loadingRes || loadingListings
  const error = errorRes || errorListings

  // Fusion : les vehicles "reserved à la main" sont ajoutés à la liste,
  // sauf si une Reservation existe déjà pour ce vehicleId (pour éviter les
  // doublons quand le workflow Stripe s'aligne avec le status listing).
  const unified: UnifiedRow[] = useMemo(() => {
    const vehiclesWithReservation = new Set(reservations.map((r) => r.vehicleId))
    const listingsData = reservedListings?.data ?? []
    const manualRows: UnifiedRow[] = listingsData
      .filter((v) => !vehiclesWithReservation.has(v.id))
      .map((v) => ({
        source: 'manual',
        key: `manual-${v.id}`,
        date: v.reservedAt ?? v.updatedAt ?? v.createdAt ?? '',
        user: v.reservedByUser
          ? { name: v.reservedByUser.name, email: v.reservedByUser.email }
          : undefined,
        vehicle: v,
      }))

    const stripeRows: UnifiedRow[] = reservations.map((r) => ({
      source: 'stripe',
      key: `stripe-${r.id}`,
      date: r.createdAt,
      user: r.user ? { name: r.user.name, email: r.user.email } : undefined,
      vehicle: r.vehicle,
      depositAmount: r.depositAmount,
      reservationStatus: r.status,
      lastPaymentStatus: r.payments?.[0]?.status,
    }))

    return [...stripeRows, ...manualRows].sort((a, b) =>
      (b.date || '').localeCompare(a.date || ''),
    )
  }, [reservations, reservedListings])

  const stats = {
    total: unified.length,
    stripe: unified.filter((r) => r.source === 'stripe').length,
    pending: reservations.filter((r) => r.status === 'pending_payment').length,
    confirmed: reservations.filter((r) => r.status === 'confirmed').length,
    manual: unified.filter((r) => r.source === 'manual').length,
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
              <CardDescription>Confirmées Stripe</CardDescription>
              <CardTitle className="text-3xl text-green-600">{isLoading ? '…' : stats.confirmed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Réservées à la main</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{isLoading ? '…' : stats.manual}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Réservations</CardTitle>
            <CardDescription>
              Vue unifiée : réservations Stripe (workflow customer) + véhicules
              réservés à la main via l'admin. Chaque ligne indique sa source.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : unified.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Caution</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Paiement</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unified.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {row.date ? formatDate(row.date) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{row.user?.name || '—'}</span>
                          <span className="text-xs text-muted-foreground">{row.user?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.vehicle ? (
                          <Link
                            to="/listings/$id"
                            params={{ id: row.vehicle.id }}
                            className="hover:underline"
                          >
                            {row.vehicle.brand} {row.vehicle.model} · {row.vehicle.year}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {row.source === 'stripe' ? formatCurrency(row.depositAmount) : '—'}
                      </TableCell>
                      <TableCell>
                        {row.source === 'stripe' ? (
                          reservationStatusBadge(row.reservationStatus)
                        ) : (
                          <Badge variant="secondary">Réservé</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.source === 'stripe' ? (
                          paymentStatusBadge(row.lastPaymentStatus)
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.source === 'stripe' ? (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Stripe
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">
                            Manuel
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
