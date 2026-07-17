import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ordersService,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEP,
  STEP_LABELS,
  type OrderStatus,
} from '@/services/orders.service'

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]

function formatEuros(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isNaN(n)) return String(v)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function orderStatusBadge(status: OrderStatus) {
  const step = ORDER_STATUS_STEP[status]
  let variant: 'default' | 'success' | 'warning' | 'secondary' | 'destructive' =
    'secondary'
  if (status === 'cancelled') variant = 'destructive'
  else if (status === 'delivered') variant = 'success'
  else if (step === 4 || status === 'balance_escrowed') variant = 'success'
  else if (step === 1 || step === 2 || step === 3) variant = 'warning'
  else variant = 'default'
  return (
    <Badge variant={variant} className="whitespace-nowrap">
      {step > 0 ? `${step}. ` : ''}
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  )
}

function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-orders', { statusFilter, search, page }],
    queryFn: () =>
      ordersService.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        page,
        limit,
      }),
  })

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Commandes</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline séquestre B2B — 8 étapes de la réservation à la livraison.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtres</CardTitle>
            <CardDescription className="text-xs">
              Filtrer par statut ou rechercher un numéro de commande.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as OrderStatus | 'all')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {ALL_STATUSES.map((s) => {
                  const step = ORDER_STATUS_STEP[s]
                  return (
                    <SelectItem key={s} value={s}>
                      {step > 0 ? `${step}. ` : ''}
                      {ORDER_STATUS_LABELS[s]}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <Input
              placeholder="Rechercher (n°, réf. virement, véhicule, concession, client…)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-[380px]"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Liste</CardTitle>
            <CardDescription className="text-xs">
              {data
                ? `${data.meta.total} commande${data.meta.total > 1 ? 's' : ''}`
                : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                Erreur : {(error as Error).message}
              </p>
            )}
            {data && data.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune commande.</p>
            )}
            {data && data.data.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Étape</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Concession</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Prix véhicule</TableHead>
                      <TableHead className="text-right">Net conc.</TableHead>
                      <TableHead>Créée</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((o) => {
                      const step = ORDER_STATUS_STEP[o.status]
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">
                            {o.orderNumber}
                          </TableCell>
                          <TableCell>{orderStatusBadge(o.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {step > 0 ? STEP_LABELS[step] : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {o.vehicle.brand} {o.vehicle.model}{' '}
                            <span className="text-muted-foreground">
                              ({o.vehicle.year})
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {o.seller.ragioneSociale || o.seller.name}
                            {o.seller.city && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                · {o.seller.city}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {o.user.name}
                            <div className="text-xs text-muted-foreground">
                              {o.user.email}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatEuros(o.vehicleTotalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {formatEuros(o.sellerNetPayoutAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <Button asChild size="sm" variant="outline">
                              <Link
                                to="/orders/$id"
                                params={{ id: o.id }}
                              >
                                Ouvrir
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {data.meta.pages > 1 && (
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Page {data.meta.page} / {data.meta.pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= data.meta.pages}
                        onClick={() =>
                          setPage((p) => Math.min(data.meta.pages, p + 1))
                        }
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/orders/')({
  component: OrdersPage,
})
