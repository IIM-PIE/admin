import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { paymentsService } from '@/services/payments.service'
import type { PaymentStatus } from '@/types'

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'En cours',
  succeeded: 'Réussi',
  failed: 'Échec',
  cancelled: 'Annulé',
}

const paymentStatusBadge = (status: PaymentStatus) => {
  const variant: 'success' | 'warning' | 'destructive' | 'secondary' =
    status === 'succeeded' ? 'success'
    : status === 'pending' ? 'warning'
    : status === 'failed' ? 'destructive'
    : 'secondary'
  return <Badge variant={variant}>{PAYMENT_STATUS_LABEL[status]}</Badge>
}

function formatCurrency(value?: string | number | null): string {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '—'
  return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Construit l'URL Stripe Dashboard pour un PaymentIntent.
 * - Les IDs `pi_test_...` (mode test) → dashboard.stripe.com/test/payments/...
 * - Les IDs `pi_live_...` ou classiques `pi_3XXX...` → dashboard.stripe.com/payments/...
 *
 * On distingue par la présence de `_test_` dans l'ID. Sur les IDs Stripe
 * modernes (`pi_3XXX` sans marqueur test), l'URL /payments/ redirigera de
 * toute façon vers /test/payments/ si la clé secrète du back est une clé test.
 */
function stripeDashboardUrl(paymentIntentId: string): string {
  const isTest = paymentIntentId.includes('_test_')
  return isTest
    ? `https://dashboard.stripe.com/test/payments/${paymentIntentId}`
    : `https://dashboard.stripe.com/payments/${paymentIntentId}`
}

type StatusFilter = 'all' | PaymentStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'succeeded', label: 'Réussis' },
  { value: 'pending', label: 'En cours' },
  { value: 'failed', label: 'Échecs' },
  { value: 'cancelled', label: 'Annulés' },
]

function PaymentsPage() {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments', filter],
    queryFn: () => paymentsService.getAll(filter === 'all' ? undefined : filter),
  })

  // Stats affichées en haut (calculées uniquement sur la vue "all" — pour le
  // reste on n'a pas les autres statuts sous la main sans un fetch dédié ;
  // acceptable, la vue "all" est le cas d'usage principal).
  const stats = {
    total: payments.length,
    succeeded: payments.filter((p) => p.status === 'succeeded').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    failed: payments.filter((p) => p.status === 'failed').length,
    totalAmount: payments
      .filter((p) => p.status === 'succeeded')
      .reduce((acc, p) => acc + Number(p.amount ?? 0), 0),
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-destructive">Erreur de chargement des paiements</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{isLoading ? '…' : stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Réussis</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {isLoading ? '…' : stats.succeeded}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Encaissé (réussis)</CardDescription>
              <CardTitle className="text-3xl">
                {isLoading ? '…' : formatCurrency(stats.totalAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>En cours / échecs</CardDescription>
              <CardTitle className="text-3xl text-orange-600">
                {isLoading ? '…' : stats.pending + stats.failed}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>Paiements Stripe</CardTitle>
                <CardDescription>
                  Toutes les cautions encaissées ou en attente, du plus récent au plus ancien.
                  Cliquer sur l'icône <ExternalLink className="inline h-3 w-3" /> ouvre le
                  paiement directement dans le Stripe Dashboard pour aller creuser (méthode de
                  paiement, événements webhook, remboursements, etc.).
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    type="button"
                    variant={filter === f.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Statut Stripe</TableHead>
                    <TableHead>Stripe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const user = p.reservation?.user
                    const vehicle = p.reservation?.vehicle
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(p.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user?.name || '—'}</span>
                            <span className="text-xs text-muted-foreground">{user?.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {vehicle ? (
                            <Link
                              to="/listings/$id"
                              params={{ id: vehicle.id }}
                              className="hover:underline"
                            >
                              {vehicle.brand} {vehicle.model} · {vehicle.year}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell>{paymentStatusBadge(p.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.stripeStatus ?? '—'}
                        </TableCell>
                        <TableCell>
                          {p.stripePaymentIntentId ? (
                            <a
                              href={stripeDashboardUrl(p.stripePaymentIntentId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              title={`Voir ${p.stripePaymentIntentId} sur Stripe Dashboard`}
                            >
                              <span className="font-mono">
                                {p.stripePaymentIntentId.slice(0, 12)}…
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun paiement</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/payments/')({
  component: PaymentsPage,
})
