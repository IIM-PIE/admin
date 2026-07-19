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
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OrderWorkflowTimeline } from '@/components/orders/order-workflow-timeline'
import {
  ordersService,
  CANCELLATION_REASON_LABELS,
  CLIENT_DOCUMENT_LABELS,
  DOCUMENT_REJECTION_REASON_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEP,
  ORDER_TRANSITIONS,
  ORDER_ROLLBACK_TRANSITIONS,
  REQUIRED_CLIENT_DOCUMENT_TYPES,
  STEP_LABELS,
  type CancellationReason,
  type DocumentRejectionReason,
  type OrderDocument,
  type OrderStatus,
  type RequiredClientDocumentType,
} from '@/services/orders.service'
import { documentsService } from '@/services/documents.service'
import { useAuth } from '@/contexts/auth-context'

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
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)
  const [payoutReference, setPayoutReference] = useState('')

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState<CancellationReason>('client_request')
  const [cancelRefundOverride, setCancelRefundOverride] = useState<
    'default' | 'yes' | 'no'
  >('default')
  const [cancelNote, setCancelNote] = useState('')

  // Rollback dialog (admin only)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [rollbackTo, setRollbackTo] = useState<OrderStatus | null>(null)
  const [rollbackReason, setRollbackReason] = useState('')

  // Reject document dialog
  const [rejectDocOpen, setRejectDocOpen] = useState(false)
  const [rejectDoc, setRejectDoc] = useState<OrderDocument | null>(null)
  const [rejectReason, setRejectReason] = useState<DocumentRejectionReason>('illegible')
  const [rejectNote, setRejectNote] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersService.getOne(id),
  })

  const { data: history } = useQuery({
    queryKey: ['admin-order', id, 'history'],
    queryFn: () => ordersService.getHistory(id),
    enabled: !!order,
  })

  const invalidateOrderQueries = () => {
    // On invalide ET on force un refetch immédiat des queries actives. La
    // simple invalidation ne suffit pas dans tous les cas (composant qui
    // reste monté sans window focus, cache stale-while-revalidate qui
    // affiche l'ancienne donnée le temps du fetch). refetchQueries force
    // un GET tout de suite et le composant re-render dès la réponse.
    queryClient.invalidateQueries({ queryKey: ['admin-order', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-order', id, 'history'] })
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    void queryClient.refetchQueries({ queryKey: ['admin-order', id], type: 'active' })
    void queryClient.refetchQueries({ queryKey: ['admin-order', id, 'history'], type: 'active' })
  }

  const transitionMutation = useMutation({
    mutationFn: (payload: {
      status: OrderStatus
      payoutReference?: string
    }) => ordersService.transition(id, payload),
    onSuccess: (updated) => {
      toast.success(
        `Commande passée à : ${ORDER_STATUS_LABELS[updated.status]}`,
      )
      invalidateOrderQueries()
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

  const cancelMutation = useMutation({
    mutationFn: () =>
      ordersService.cancel(id, {
        reason: cancelReason,
        refund:
          cancelRefundOverride === 'default'
            ? undefined
            : cancelRefundOverride === 'yes',
        note: cancelNote.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Commande annulée')
      invalidateOrderQueries()
      setCancelDialogOpen(false)
      setCancelReason('client_request')
      setCancelRefundOverride('default')
      setCancelNote('')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Erreur annulation',
      )
    },
  })

  const rollbackMutation = useMutation({
    mutationFn: () => {
      if (!rollbackTo) throw new Error('Statut cible manquant')
      return ordersService.rollback(id, {
        toStatus: rollbackTo,
        reason: rollbackReason.trim(),
      })
    },
    onSuccess: (updated) => {
      toast.success(
        `Rollback effectué — statut : ${ORDER_STATUS_LABELS[updated.status]}`,
      )
      invalidateOrderQueries()
      setRollbackDialogOpen(false)
      setRollbackTo(null)
      setRollbackReason('')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Erreur rollback',
      )
    },
  })

  const validateDocMutation = useMutation({
    mutationFn: (documentId: string) => ordersService.validateDocument(documentId),
    onSuccess: () => {
      toast.success('Document validé')
      invalidateOrderQueries()
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Erreur validation',
      )
    },
  })

  const rejectDocMutation = useMutation({
    mutationFn: () => {
      if (!rejectDoc) throw new Error('Document manquant')
      return ordersService.rejectDocument(rejectDoc.id, {
        reason: rejectReason,
        note: rejectNote.trim() || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Document rejeté — le client sera notifié')
      invalidateOrderQueries()
      setRejectDocOpen(false)
      setRejectDoc(null)
      setRejectReason('illegible')
      setRejectNote('')
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || 'Erreur rejet',
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
  // Source de vérité 100 % back : `order.availableTransitions` renvoyé
  // par /admin/orders/:id est déjà filtré par le rôle du user courant
  // (admin | agent). Les transitions seller-only (payout_confirmed,
  // ready_for_pickup) N'apparaissent PAS ici — le back les refuserait
  // de toute façon. Fallback sur ORDER_TRANSITIONS local uniquement si
  // le back ne renvoie pas encore le champ (compat déploiement).
  const allowedNext: OrderStatus[] =
    (order as any).availableTransitions ?? ORDER_TRANSITIONS[order.status]
  // Bouton Annuler séparé de la ligne des transitions avant : plus clair
  // pour l'ops (une action = un bouton dédié).
  const forwardTransitions = allowedNext.filter((s) => s !== 'cancelled')
  const canCancelNow = allowedNext.includes('cancelled')
  const rollbackTargets = ORDER_ROLLBACK_TRANSITIONS[order.status] ?? []
  const requiresPayoutRef = pendingStatus === 'payout_initiated'

  // Compteur x/3 des pièces client obligatoires validées.
  const validatedClientDocTypes = new Set(
    order.documents
      .filter(
        (d) =>
          d.status === 'validated' &&
          (REQUIRED_CLIENT_DOCUMENT_TYPES as readonly string[]).includes(d.type),
      )
      .map((d) => d.type as RequiredClientDocumentType),
  )
  const clientDocsValidatedCount = validatedClientDocTypes.size
  const missingClientDocTypes = REQUIRED_CLIENT_DOCUMENT_TYPES.filter(
    (t) => !validatedClientDocTypes.has(t),
  )

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
            <CardTitle className="text-base">Pipeline 9 étapes</CardTitle>
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
              <CardTitle className="text-base">Répartition financière</CardTitle>
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
                <div>Solde reçu : {formatDate(order.escrowReceivedAt)}</div>
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
                Faire progresser la commande, ou la corriger si besoin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Avancer
                </div>
                {forwardTransitions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune transition avant disponible depuis ce statut.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {forwardTransitions.map((s) => (
                      <Button
                        key={s}
                        variant="default"
                        size="sm"
                        onClick={() => openConfirm(s)}
                      >
                        → {ORDER_STATUS_LABELS[s]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {(canCancelNow || (isAdmin && rollbackTargets.length > 0)) && (
                <div className="border-t pt-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Corriger
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canCancelNow && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        Annuler la commande
                      </Button>
                    )}
                    {isAdmin &&
                      rollbackTargets.map((s) => (
                        <Button
                          key={`rb-${s}`}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRollbackTo(s)
                            setRollbackReason('')
                            setRollbackDialogOpen(true)
                          }}
                        >
                          ← Rollback vers {ORDER_STATUS_LABELS[s]}
                        </Button>
                      ))}
                  </div>
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
              Historique ({history?.length ?? 0})
            </CardTitle>
            <CardDescription className="text-xs">
              Trace des <code className="text-[11px]">audit_logs</code> — transitions
              avant, rollbacks, annulations. Ce qui s'est passé sur la commande, par qui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune entrée dans l'audit_logs pour cette commande.
              </p>
            ) : (
              <ol className="space-y-2 text-sm">
                {history.map((h) => {
                  const isRollback = h.action === 'ORDER_ROLLBACK'
                  const isCancelled = h.action === 'ORDER_CANCELLED'
                  const arrow = isRollback ? '←' : '→'
                  const toStatus = (isCancelled ? 'cancelled' : h.changes.to) as OrderStatus | undefined
                  return (
                    <li
                      key={h.id}
                      className="border-b pb-2 last:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <Badge
                            variant={
                              isCancelled
                                ? 'destructive'
                                : isRollback
                                  ? 'outline'
                                  : 'default'
                            }
                            className="mr-2 text-[10px]"
                          >
                            {isCancelled
                              ? 'Annulation'
                              : isRollback
                                ? 'Rollback'
                                : 'Transition'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {ORDER_STATUS_LABELS[h.changes.from as OrderStatus] ??
                              h.changes.from}
                          </span>
                          {' '}{arrow}{' '}
                          <span className="font-medium">
                            {toStatus
                              ? ORDER_STATUS_LABELS[toStatus] ?? toStatus
                              : '—'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(h.createdAt)}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Par : {h.user ? `${h.user.name} (${h.user.email})` : '—'}
                        {h.changes.payoutReference && (
                          <span className="ml-2 font-mono">
                            réf. {h.changes.payoutReference}
                          </span>
                        )}
                      </div>
                      {(isRollback || isCancelled) && h.changes.reason && (
                        <div className="text-xs mt-1">
                          <span className="text-muted-foreground">
                            {isCancelled ? 'Motif : ' : 'Raison : '}
                          </span>
                          {isCancelled
                            ? CANCELLATION_REASON_LABELS[
                                h.changes.reason as CancellationReason
                              ] ?? h.changes.reason
                            : h.changes.reason}
                        </div>
                      )}
                      {isCancelled && typeof h.changes.refund === 'boolean' && (
                        <div className="text-xs text-muted-foreground">
                          Remboursement : {h.changes.refund ? 'oui' : 'non'}
                        </div>
                      )}
                      {isCancelled && h.changes.note && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          « {h.changes.note} »
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-3">
              Documents ({order.documents.length})
              {order.status === 'awaiting_client_docs' && (
                <Badge
                  variant={
                    clientDocsValidatedCount >= REQUIRED_CLIENT_DOCUMENT_TYPES.length
                      ? 'success'
                      : 'warning'
                  }
                >
                  Pièces client : {clientDocsValidatedCount}/
                  {REQUIRED_CLIENT_DOCUMENT_TYPES.length} validées
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Pièces liées à cette commande — attention : contenu sensible.
              {order.status === 'awaiting_client_docs' &&
                clientDocsValidatedCount < REQUIRED_CLIENT_DOCUMENT_TYPES.length && (
                  <>
                    {' '}Manque :{' '}
                    <span className="font-medium">
                      {missingClientDocTypes
                        .map((t) => CLIENT_DOCUMENT_LABELS[t])
                        .join(', ')}
                    </span>
                    .
                  </>
                )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun document uploadé pour cette commande.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {order.documents.map((doc) => {
                  const isRequired = (REQUIRED_CLIENT_DOCUMENT_TYPES as readonly string[]).includes(
                    doc.type,
                  )
                  return (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-start justify-between gap-3 border-b pb-3 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium flex items-center flex-wrap gap-2">
                          {doc.name}
                          {doc.status === 'validated' && (
                            <Badge variant="success" className="text-[10px]">
                              validé{doc.validatedAt ? ` · ${formatDate(doc.validatedAt)}` : ''}
                            </Badge>
                          )}
                          {doc.status === 'rejected' && (
                            <Badge variant="destructive" className="text-[10px]">
                              rejeté{doc.rejectedAt ? ` · ${formatDate(doc.rejectedAt)}` : ''}
                            </Badge>
                          )}
                          {doc.status === 'pending' && (
                            <Badge variant="warning" className="text-[10px]">
                              en attente
                            </Badge>
                          )}
                          {isRequired && (
                            <Badge variant="outline" className="text-[10px]">
                              pièce obligatoire
                            </Badge>
                          )}
                          {doc.isSensitive && (
                            <Badge variant="destructive" className="text-[10px]">
                              sensible
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.type} · téléversé le {formatDate(doc.uploadedAt)}
                        </div>
                        {doc.status === 'rejected' && doc.rejectionReason && (
                          <div className="text-xs text-destructive mt-1">
                            Motif :{' '}
                            {DOCUMENT_REJECTION_REASON_LABELS[doc.rejectionReason]}
                            {doc.rejectionNote && ` — ${doc.rejectionNote}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={async () => {
                            try {
                              await documentsService.openDocument(doc.id)
                            } catch (e: any) {
                              toast.error(
                                e.response?.data?.message ||
                                  "Impossible d'ouvrir le document",
                              )
                            }
                          }}
                        >
                          Ouvrir
                        </button>
                        {doc.status !== 'validated' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validateDocMutation.mutate(doc.id)}
                            disabled={validateDocMutation.isPending}
                          >
                            Valider
                          </Button>
                        )}
                        {doc.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectDoc(doc)
                              setRejectReason('illegible')
                              setRejectNote('')
                              setRejectDocOpen(true)
                            }}
                          >
                            Rejeter
                          </Button>
                        )}
                      </div>
                    </li>
                  )
                })}
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
              . Le back valide la transition ; une fois les pièces client validées,
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

      {/* Cancel dialog — annulation avec motif + politique refund */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => !open && setCancelDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la commande</DialogTitle>
            <DialogDescription>
              Ferme définitivement la commande{' '}
              <span className="font-mono">{order.orderNumber}</span> et
              republie le véhicule au catalogue. La politique de
              remboursement de l'acompte dépend du motif choisi ci-dessous.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motif</Label>
              <Select
                value={cancelReason}
                onValueChange={(v) =>
                  setCancelReason(v as CancellationReason)
                }
              >
                <SelectTrigger id="cancel-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CANCELLATION_REASON_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-refund">Politique refund</Label>
              <Select
                value={cancelRefundOverride}
                onValueChange={(v) =>
                  setCancelRefundOverride(v as 'default' | 'yes' | 'no')
                }
              >
                <SelectTrigger id="cancel-refund">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    Par défaut selon le motif (
                    {cancelReason === 'client_request'
                      ? 'retenir'
                      : 'rembourser'}
                    )
                  </SelectItem>
                  <SelectItem value="yes">Forcer remboursement</SelectItem>
                  <SelectItem value="no">Forcer rétention</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Le vrai appel Stripe refund est traité en Phase 1.5 — pour
                l'instant l'action est notée dans l'audit trail.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancel-note">
                Note interne (optionnelle)
              </Label>
              <Textarea
                id="cancel-note"
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Contexte, remarques ops, etc."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? 'Envoi…'
                : 'Confirmer l\'annulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback dialog — admin only, raison libre obligatoire */}
      <Dialog
        open={rollbackDialogOpen}
        onOpenChange={(open) => !open && setRollbackDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback d'un cran</DialogTitle>
            <DialogDescription>
              Fait reculer la commande{' '}
              <span className="font-mono">{order.orderNumber}</span> vers{' '}
              <strong>
                {rollbackTo && ORDER_STATUS_LABELS[rollbackTo]}
              </strong>
              . Reset les timestamps du statut abandonné côté back mais ne
              compense PAS les effets physiques (virement bancaire réel,
              docs uploadés) — à défaire à la main.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <Label htmlFor="rollback-reason">
              Raison (obligatoire, min 10 caractères)
            </Label>
            <Textarea
              id="rollback-reason"
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="Ex. virement suspendu côté banque Strada, à retenter"
              rows={4}
              minLength={10}
              maxLength={500}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {rollbackReason.trim().length}/10 caractères minimum. Cette
              raison est loguée dans l'audit trail.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRollbackDialogOpen(false)}
              disabled={rollbackMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => rollbackMutation.mutate()}
              disabled={
                rollbackMutation.isPending ||
                rollbackReason.trim().length < 10
              }
            >
              {rollbackMutation.isPending ? 'Envoi…' : 'Confirmer le rollback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject document dialog — motif enum + note (obligatoire si "other") */}
      <Dialog
        open={rejectDocOpen}
        onOpenChange={(open) => !open && setRejectDocOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter le document</DialogTitle>
            <DialogDescription>
              Le client sera notifié du rejet et pourra ré-uploader une
              nouvelle version. {rejectDoc && (
                <>
                  Document :{' '}
                  <span className="font-medium">{rejectDoc.name}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motif</Label>
              <Select
                value={rejectReason}
                onValueChange={(v) =>
                  setRejectReason(v as DocumentRejectionReason)
                }
              >
                <SelectTrigger id="reject-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOCUMENT_REJECTION_REASON_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-note">
                Note {rejectReason === 'other' ? '(obligatoire)' : '(optionnelle)'}
              </Label>
              <Textarea
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={
                  rejectReason === 'other'
                    ? 'Expliquer précisément le motif du rejet (visible côté client).'
                    : 'Précision optionnelle sur le motif.'
                }
                rows={3}
                maxLength={500}
              />
              {rejectReason === 'other' && rejectNote.trim().length < 5 && (
                <p className="text-xs text-destructive">
                  Note requise (min 5 caractères) quand le motif est "Autre".
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDocOpen(false)}
              disabled={rejectDocMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDocMutation.mutate()}
              disabled={
                rejectDocMutation.isPending ||
                (rejectReason === 'other' && rejectNote.trim().length < 5)
              }
            >
              {rejectDocMutation.isPending ? 'Envoi…' : 'Confirmer le rejet'}
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
