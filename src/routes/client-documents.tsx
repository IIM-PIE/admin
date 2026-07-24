import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { CheckCircle2, XCircle, BellRing, FileText } from 'lucide-react'
import {
  clientDocumentsService,
  type ClientDocument,
  type ClientDocumentStatus,
} from '@/services/client-documents.service'

export const Route = createFileRoute('/client-documents')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ClientDocumentsPage,
})

const TYPE_LABEL: Record<string, string> = {
  carte_identite: "Carte d'identité",
  passeport: 'Passeport',
  justificatif_domicile: 'Justif domicile',
  justificatif_virement: 'Justif virement',
  rib: 'RIB',
}

function statusBadge(status: ClientDocumentStatus, expiresAt: string) {
  if (status === 'active') {
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 30) {
      return <Badge variant="outline" className="border-orange-400 text-orange-600">Expire J-{daysLeft}</Badge>
    }
    return <Badge variant="default">Actif</Badge>
  }
  const map: Record<ClientDocumentStatus, { label: string; variant: any }> = {
    pending_validation: { label: 'À valider', variant: 'secondary' },
    active: { label: 'Actif', variant: 'default' },
    rejected: { label: 'Rejeté', variant: 'destructive' },
    expired: { label: 'Expiré', variant: 'outline' },
    revoked: { label: 'Révoqué', variant: 'outline' },
  }
  const cfg = map[status]
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

function DocCard({
  d,
  onValidate,
  onReject,
  disabled,
}: {
  d: ClientDocument
  onValidate: (id: string) => void
  onReject: (d: ClientDocument) => void
  disabled: boolean
}) {
  const fileSize = d.fileSize ? `${Math.round(d.fileSize / 1024)} Ko` : ''
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {d.name}
              <Badge variant="outline" className="font-mono text-xs">
                {TYPE_LABEL[d.type] ?? d.type}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {d.user?.name || 'Client'} · {d.user?.email || d.userId.slice(0, 8)}
              {' · '} uploadé {new Date(d.uploadedAt).toLocaleDateString('fr-FR')}
              {d.mimeType && ' · '}{d.mimeType} {fileSize && `· ${fileSize}`}
            </CardDescription>
          </div>
          {statusBadge(d.status, d.expiresAt)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded border bg-muted/30 p-2">
            <div className="text-muted-foreground">Valide jusqu'au</div>
            <div className="mt-1 font-medium">
              {new Date(d.expiresAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </div>
          </div>
          <div className="rounded border bg-muted/30 p-2">
            <div className="text-muted-foreground">Consentement RGPD</div>
            <div className="mt-1 font-medium">
              ✓ Donné le {new Date(d.consentGivenAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
        {d.rejectionReason && (
          <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
            <span className="font-medium">Raison du rejet : </span>
            {d.rejectionReason}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {d.status === 'pending_validation' && (
            <>
              <Button size="sm" onClick={() => onValidate(d.id)} disabled={disabled}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Valider
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(d)}
                disabled={disabled}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Rejeter
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ClientDocumentsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<ClientDocumentStatus>('pending_validation')
  const [rejectDialog, setRejectDialog] = useState<ClientDocument | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['client-documents', 'all', tab],
    queryFn: () => clientDocumentsService.listAll(tab, 1, 50),
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => clientDocumentsService.validate(id),
    onSuccess: () => {
      toast.success('Doc validé — sera rattaché automatiquement aux futures commandes du client.')
      queryClient.invalidateQueries({ queryKey: ['client-documents'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Échec validation'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      clientDocumentsService.reject(id, reason),
    onSuccess: () => {
      toast.success('Doc rejeté — le client sera notifié pour renvoyer.')
      queryClient.invalidateQueries({ queryKey: ['client-documents'] })
      setRejectDialog(null)
      setReason('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Échec rejet'),
  })

  const scanMutation = useMutation({
    mutationFn: () => clientDocumentsService.scanExpiring(30),
    onSuccess: (data) => {
      toast.success(
        `Scan terminé : ${data.notified} notifs envoyées, ${data.skipped} skippées (déjà notifiées <24h).`,
      )
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Scan échoué'),
  })

  const submitReject = () => {
    if (!rejectDialog) return
    if (reason.trim().length < 10) {
      toast.error('Raison obligatoire (min 10 caractères).')
      return
    }
    rejectMutation.mutate({ id: rejectDialog.id, reason: reason.trim() })
  }

  const items = data?.data ?? []
  const busy = validateMutation.isPending || rejectMutation.isPending

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents personnels client</h1>
            <p className="text-sm text-muted-foreground">
              Valide ou rejette les pièces uploadées par les clients depuis leur profil mobile. Un doc validé
              est rattaché <strong>automatiquement</strong> aux futures commandes du client (CNI, justif domicile,
              justif virement) — plus besoin de re-uploader à chaque fois.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
          >
            <BellRing className="mr-2 h-4 w-4" />
            Scanner expirations J-30
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as ClientDocumentStatus)}>
          <TabsList>
            <TabsTrigger value="pending_validation">À valider</TabsTrigger>
            <TabsTrigger value="active">Actifs</TabsTrigger>
            <TabsTrigger value="rejected">Rejetés</TabsTrigger>
            <TabsTrigger value="expired">Expirés</TabsTrigger>
          </TabsList>

          {(['pending_validation', 'active', 'rejected', 'expired'] as ClientDocumentStatus[]).map(
            (s) => (
              <TabsContent key={s} value={s} className="space-y-3 mt-4">
                {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
                {!isLoading && items.length === 0 && (
                  <Card>
                    <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                      Aucun document dans cet onglet.
                    </CardContent>
                  </Card>
                )}
                {items.map((d) => (
                  <DocCard
                    key={d.id}
                    d={d}
                    onValidate={(id) => validateMutation.mutate(id)}
                    onReject={(doc) => {
                      setRejectDialog(doc)
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
            <DialogTitle>Rejeter le document</DialogTitle>
            <DialogDescription>
              Raison obligatoire (min 10 caractères) — visible côté client dans la notif de rejet et sur l'écran "Mes documents".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Capture floue, impossible de lire les informations. Merci de renvoyer un scan net."
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
            <Button variant="destructive" onClick={submitReject} disabled={busy}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
