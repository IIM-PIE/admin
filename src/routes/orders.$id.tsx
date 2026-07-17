import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderWorkflowTimeline } from '@/components/orders/order-workflow-timeline'
import {
  ordersService,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEP,
  ORDER_TRANSITIONS,
  STEP_LABELS,
  type OrderStatus,
} from '@/services/orders.service'
import { documentsService } from '@/services/documents.service'

function formatEuros(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (Number.isNaN(n)) return String(v)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(n)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function statusVariant(status: OrderStatus) {
  if (status === 'cancelled') return 'destructive' as const
  if (status === 'delivered') return 'success' as const
  const step = ORDER_STATUS_STEP[status]
  if (step >= 4) return 'success' as const
  return 'warning' as const
}

function OrderDetailPage() {
  const { id } = Route.useParams()
  const queryClient = useQueryClient()
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [payoutReference, setPayoutReference] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersService.getOne(id),
  })

  const { data: history } = useQuery({
    queryKey: ['admin-order', id, 'history'],
    queryFn: () => ordersService.getHistory(id),
    enabled: !!order,
  })

  const transitionMutation = useMutation({
    mutationFn: (payload: {
      status: OrderStatus
      payoutReference?: string
    }) => ordersService.transition(id, payload),
    onSuccess: (updated) => {
      toast.success(
        `Commande passée à : ${ORDER_STATUS_LABELS[updated.status]}`,
      )
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-order', id, 'history'] })
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      setPendingStatus(null)
      setPayoutReference('')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Erreur transition',
      )
    },
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </DashboardLayout>
    )
  }

  if (error || !order) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              Erreur : {(error as Error)?.message || 'Commande introuvable'}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/orders">Retour à la liste</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const currentStep = ORDER_STATUS_STEP[order.status]
  const allowedNext = ORDER_TRANSITIONS[order.status]
  const requiresPayoutRef = pendingStatus === 'payout_initiated'

  const openConfirm = (status: OrderStatus) => {
    setPendingStatus(status)
    setPayoutReference('')
  }

  const confirmTransition = () => {
    if (!pendingStatus) return
    if (requiresPayoutRef && !payoutReference.trim()) {
      toast.error('Référence bancaire requise pour le payout.')
      return
    }
    transitionMutation.mutate({
      status: pendingStatus,
      payoutReference: requiresPayoutRef ? payoutReference.trim() : undefined,
    })
  }


  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/orders">Commandes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono">
                {order.orderNumber}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {order.vehicle.brand} {order.vehicle.model}{' '}
              <span className="text-muted-foreground">
                ({order.vehicle.year})
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Commande{' '}
              <span className="font-mono">{order.orderNumber}</span> — étape{' '}
              {currentStep > 0
                ? `${currentStep} · ${STEP_LABELS[currentStep]}`
                : 'annulée'}
            </p>
          </div>
          <Badge variant={statusVariant(order.status)} className="text-sm">
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline 8 étapes</CardTitle>
            <CardDescription className="text-xs">
              Reflet visuel du parcours réservation → livraison.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OrderWorkflowTimeline status={order.status} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chiffres séquestre</CardTitle>
              <CardDescription className="text-xs">
                Répartition financière de la commande.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix véhicule</span>
                <span className="tabular-nums font-medium">
                  {formatEuros(order.vehicleTotalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acompte</span>
                <span className="tabular-nums">
                  {formatEuros(order.depositAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commission Strada</span>
                <span className="tabular-nums text-primary">
                  {formatEuros(order.stradaCommission)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2">
                <span className="font-medium">Net concessionnaire</span>
                <span className="tabular-nums font-semibold">
                  {formatEuros(order.sellerNetPayoutAmount)}
                </span>
              </div>
              <div className="pt-3 space-y-1 text-xs text-muted-foreground">
                <div>Séquestre reçu : {formatDate(order.escrowReceivedAt)}</div>
                <div>
                  Payout initié : {formatDate(order.payoutInitiatedAt)}
                  {order.payoutReference && (
                    <span className="ml-1 font-mono">
                      (réf. {order.payoutReference})
                    </span>
                  )}
                </div>
                <div>Prêt enlèvement : {formatDate(order.readyForPickupAt)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actions Strada</CardTitle>
              <CardDescription className="text-xs">
                Faire progresser la commande dans le pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allowedNext.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune action disponible depuis ce statut.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allowedNext.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'cancelled' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => openConfirm(s)}
                    >
                      → {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Concessionnaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">
                {order.seller.ragioneSociale || order.seller.name}
              </div>
              {order.seller.partitaIva && (
                <div className="text-xs text-muted-foreground">
                  Partita IVA : {order.seller.partitaIva}
                </div>
              )}
              {order.seller.codiceFiscale && (
                <div className="text-xs text-muted-foreground">
                  Codice Fiscale : {order.seller.codiceFiscale}
                </div>
              )}
              {order.seller.address && (
                <div className="text-xs text-muted-foreground">
                  {order.seller.address}
                  {order.seller.postalCode && `, ${order.seller.postalCode}`}
                  {order.seller.city && ` ${order.seller.city}`}
                  {order.seller.country && ` (${order.seller.country})`}
                </div>
              )}
              {order.seller.iban && (
                <div className="pt-2 text-xs">
                  <span className="text-muted-foreground">IBAN payout :</span>{' '}
                  <span className="font-mono">{order.seller.iban}</span>
                </div>
              )}
              {order.seller.bic && (
                <div className="text-xs">
                  <span className="text-muted-foreground">BIC :</span>{' '}
                  <span className="font-mono">{order.seller.bic}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium">{order.user.name}</div>
              <div className="text-xs text-muted-foreground">
                {order.user.email}
              </div>
              {order.user.phone && (
                <div className="text-xs text-muted-foreground">
                  {order.user.phone}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Historique des transitions ({history?.length ?? 0})
            </CardTitle>
            <CardDescription className="text-xs">
              Trace de l'audit_logs — qui a fait avancer la commande, quand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune transition enregistrée (audit ORDER_TRANSITION).
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="border-b pb-2 last:border-b-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {ORDER_STATUS_LABELS[h.changes.from as OrderStatus] ??
                            h.changes.from}
                        </span>
                        {' → '}
                        <span className="font-medium">
                          {ORDER_STATUS_LABELS[h.changes.to as OrderStatus] ??
                            h.changes.to}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(h.createdAt)}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Par : {h.user ? `${h.user.name} (${h.user.email})` : '—'}
                      {h.changes.payoutReference && (
                        <span className="ml-2 font-mono">
                          réf. {h.changes.payoutReference}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Documents ({order.documents.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Pièces liées à cette commande — attention : contenu sensible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document uploadé pour cette commande.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between border-b pb-2 last:border-b-0"
                  >
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {doc.type} · téléversé le {formatDate(doc.uploadedAt)}
                        {doc.isSensitive && (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            sensible
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={async () => {
                        try {
                          const { url } = await documentsService.getDownloadUrl(doc.id)
                          window.open(url, '_blank', 'noopener,noreferrer')
                        } catch (e: any) {
                          toast.error(
                            e.response?.data?.message ||
                              'Impossible d\'ouvrir le document',
                          )
                        }
                      }}
                    >
                      Ouvrir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la transition</DialogTitle>
            <DialogDescription>
              Passer la commande{' '}
              <span className="font-mono">{order.orderNumber}</span> à :{' '}
              <strong>
                {pendingStatus && ORDER_STATUS_LABELS[pendingStatus]}
              </strong>
              . Le back valide la transition ; en cas de séquestre engagé,
              l'annulation ne sera plus possible.
            </DialogDescription>
          </DialogHeader>

          {requiresPayoutRef && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="payout-ref">Référence bancaire du virement</Label>
              <Input
                id="payout-ref"
                autoFocus
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="Ex. VIR-2026-07-INT-042"
              />
              <p className="text-xs text-muted-foreground">
                Utilisée pour tracer côté ops le virement Strada →
                concessionnaire.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingStatus(null)}
              disabled={transitionMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmTransition}
              disabled={transitionMutation.isPending}
              variant={pendingStatus === 'cancelled' ? 'destructive' : 'default'}
            >
              {transitionMutation.isPending ? 'Envoi…' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/orders/$id')({
  component: OrderDetailPage,
})
