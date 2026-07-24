import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { authService } from '@/services/auth.service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Star, ThumbsUp, EyeOff, XCircle } from 'lucide-react'
import { reviewsService, type Review, type ReviewStatus } from '@/services/reviews.service'

/**
 * Dashboard modération reviews — feature 2026-07-24.
 *
 * Règle Bogdan : toute review passe en pending_moderation par défaut,
 * admin doit approuver avant publication. Vue par onglets pour scan
 * rapide de la queue "à modérer" (défaut) + historique published/rejected/
 * hidden. Actions : approve (publiée + note comptée sur fiche annonce pro),
 * reject (raison obligatoire), hide (retirer une review déjà publiée).
 */

export const Route = createFileRoute('/reviews')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ReviewsPage,
})

function statusBadge(status: ReviewStatus) {
  const map: Record<ReviewStatus, { label: string; variant: any; icon?: string }> = {
    pending_moderation: { label: 'En attente', variant: 'secondary' },
    published: { label: 'Publiée', variant: 'default' },
    rejected: { label: 'Rejetée', variant: 'destructive' },
    hidden: { label: 'Cachée', variant: 'outline' },
  }
  const cfg = map[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function targetBadge(target: 'seller' | 'strada') {
  return (
    <Badge variant="outline" className="font-mono text-xs">
      {target === 'seller' ? 'Concessionnaire' : 'Strada'}
    </Badge>
  )
}

function StarsRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  )
}

function ReviewCard({
  r,
  onApprove,
  onReject,
  onHide,
  disabled,
}: {
  r: Review
  onApprove: (id: string) => void
  onReject: (r: Review) => void
  onHide: (r: Review) => void
  disabled: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <StarsRow rating={r.ratingOverall} />
              <span className="text-sm font-normal text-muted-foreground">
                {r.ratingOverall}/5
              </span>
              {targetBadge(r.target)}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {r.user?.name || 'Client'} · commande{' '}
              <span className="font-mono">{r.order?.orderNumber || r.orderId.slice(0, 8)}</span>
              {r.seller?.name && (
                <>
                  {' · '} vs <span className="font-medium">{r.seller.name}</span>
                </>
              )}
              {' · '} {new Date(r.createdAt).toLocaleDateString('fr-FR')}
            </CardDescription>
          </div>
          {statusBadge(r.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          {Object.entries(r.aspects).map(([key, value]) => (
            <div key={key} className="rounded border bg-muted/30 p-2">
              <div className="text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <StarsRow rating={value} />
                <span className="text-[10px] text-muted-foreground">{value}/5</span>
              </div>
            </div>
          ))}
        </div>
        {r.comment && (
          <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
            « {r.comment} »
          </blockquote>
        )}
        {r.rejectionReason && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <span className="font-medium">Raison rejet / masquage : </span>
            {r.rejectionReason}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {r.status === 'pending_moderation' && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(r.id)}
                disabled={disabled}
              >
                <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                Approuver
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(r)}
                disabled={disabled}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Rejeter
              </Button>
            </>
          )}
          {r.status === 'published' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onHide(r)}
              disabled={disabled}
            >
              <EyeOff className="mr-1 h-3.5 w-3.5" />
              Cacher
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ReviewStatus>('pending_moderation')
  const [rejectDialog, setRejectDialog] = useState<{ review: Review; kind: 'reject' | 'hide' } | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'moderation', tab],
    queryFn: () => reviewsService.listForModeration(tab, 1, 50),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewsService.approve(id),
    onSuccess: () => {
      toast.success('Review approuvée — visible publiquement sur la fiche annonce.')
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Échec approbation'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason, kind }: { id: string; reason: string; kind: 'reject' | 'hide' }) =>
      kind === 'reject'
        ? reviewsService.reject(id, reason)
        : reviewsService.hide(id, reason),
    onSuccess: (_, vars) => {
      toast.success(
        vars.kind === 'reject' ? 'Review rejetée.' : 'Review cachée du public.',
      )
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      setRejectDialog(null)
      setReason('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Échec action'),
  })

  const submitReject = () => {
    if (!rejectDialog) return
    if (reason.trim().length < 10) {
      toast.error('Raison obligatoire (min 10 caractères).')
      return
    }
    rejectMutation.mutate({
      id: rejectDialog.review.id,
      reason: reason.trim(),
      kind: rejectDialog.kind,
    })
  }

  const items = data?.data ?? []
  const busy = approveMutation.isPending || rejectMutation.isPending

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Modération des reviews</h1>
          <p className="text-sm text-muted-foreground">
            Approuve, rejette ou cache les reviews clients post-livraison.
            Une review approuvée devient visible sur la fiche annonce du
            concessionnaire et compte dans sa note moyenne publique.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ReviewStatus)}>
          <TabsList>
            <TabsTrigger value="pending_moderation">À modérer</TabsTrigger>
            <TabsTrigger value="published">Publiées</TabsTrigger>
            <TabsTrigger value="rejected">Rejetées</TabsTrigger>
            <TabsTrigger value="hidden">Cachées</TabsTrigger>
          </TabsList>

          {(['pending_moderation', 'published', 'rejected', 'hidden'] as ReviewStatus[]).map(
            (s) => (
              <TabsContent key={s} value={s} className="space-y-3 mt-4">
                {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
                {!isLoading && items.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                      Aucune review dans cet onglet.
                    </CardContent>
                  </Card>
                )}
                {items.map((r) => (
                  <ReviewCard
                    key={r.id}
                    r={r}
                    onApprove={(id) => approveMutation.mutate(id)}
                    onReject={(review) => {
                      setRejectDialog({ review, kind: 'reject' })
                      setReason('')
                    }}
                    onHide={(review) => {
                      setRejectDialog({ review, kind: 'hide' })
                      setReason('')
                    }}
                    disabled={busy}
                  />
                ))}
              </TabsContent>
            ),
          )}
        </Tabs>
      </div>

      <Dialog
        open={rejectDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog(null)
            setReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectDialog?.kind === 'reject'
                ? 'Rejeter la review'
                : 'Cacher la review publiée'}
            </DialogTitle>
            <DialogDescription>
              {rejectDialog?.kind === 'reject'
                ? "Raison obligatoire (min 10 caractères) — visible côté client dans la notif de rejet."
                : "La review sera retirée des agrégations publiques du pro mais restera dans l'historique client."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Commentaire non conforme aux CGU (insultes envers le concessionnaire)."
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null)
                setReason('')
              }}
            >
              Annuler
            </Button>
            <Button
              variant={rejectDialog?.kind === 'reject' ? 'destructive' : 'default'}
              onClick={submitReject}
              disabled={busy}
            >
              {rejectDialog?.kind === 'reject' ? 'Rejeter' : 'Cacher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
