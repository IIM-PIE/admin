import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, ExternalLink, Send, CreditCard } from 'lucide-react'
import { conversationsService } from '@/services/conversations.service'
import { reservationsService } from '@/services/reservations.service'
import { paymentsService } from '@/services/payments.service'
import type { User, Vehicle } from '@/types'

interface ReserveForClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: Pick<Vehicle, 'id' | 'brand' | 'model' | 'year' | 'price'>
  /** Client cible pré-sélectionné (ex : depuis la sidebar conv). */
  preselectedUser?: Pick<User, 'id' | 'name' | 'email'> | null
  /**
   * Reservation `pending_payment` déjà existante pour ce véhicule (ex : créée
   * par `PATCH /listings/:id status=reserved` ou par un précédent passage sur
   * ce dialog). Si fournie, on skip la création de résa et on appelle direct
   * `POST /payments/reservations/:id/checkout-session`.
   *
   * Utile pour le cas "l'admin a marqué le véhicule reserved sans encore
   * générer le lien Stripe" — sans ce champ, le POST /reservations renverrait
   * un 409 (véhicule déjà réservé).
   */
  existingReservationId?: string | null
}

type Step = 'select_client' | 'link_ready'

/**
 * Dialog admin pour réserver un véhicule au nom d'un client et générer le
 * lien Stripe Checkout à lui envoyer. Enchaîne :
 *
 *   1. POST /reservations (avec targetUserId) → Reservation `pending_payment`
 *   2. POST /payments/reservations/:id/checkout-session → URL Stripe hébergée
 *   3. Optionnel : POST /messages dans la conv liée avec un message pré-rédigé
 *
 * Le webhook Stripe existant (payment_intent.succeeded) fait basculer la
 * Reservation en `confirmed` quand le client aura payé — aucune intervention
 * manuelle possible côté admin (garde-fou stratégique).
 */
export function ReserveForClientDialog({
  open,
  onOpenChange,
  vehicle,
  preselectedUser,
  existingReservationId,
}: ReserveForClientDialogProps) {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('select_client')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [messageText, setMessageText] = useState<string>('')
  const [conversationId, setConversationId] = useState<string | null>(null)

  const depositAmount = useMemo(() => {
    const price = Number(vehicle.price)
    if (!Number.isFinite(price)) return null
    return price * 0.05
  }, [vehicle.price])

  // Pré-remplissage : si preselectedUser fourni, on l'utilise directement.
  useEffect(() => {
    if (!open) return
    if (preselectedUser?.id) {
      setSelectedUserId(preselectedUser.id)
    }
  }, [open, preselectedUser?.id])

  // Reset à la fermeture pour ne pas garder d'état stale entre 2 ouvertures.
  useEffect(() => {
    if (open) return
    setStep('select_client')
    setSelectedUserId(preselectedUser?.id ?? '')
    setCheckoutUrl(null)
    setExpiresAt(null)
    setConversationId(null)
  }, [open, preselectedUser?.id])

  // Liste des convs pour ce listing quand aucun user présélectionné.
  const { data: listingConversations } = useQuery({
    queryKey: ['conversations', 'listing', vehicle.id],
    queryFn: () => conversationsService.getListingConversations(vehicle.id),
    enabled: open && !preselectedUser,
  })

  const clientOptions = useMemo(() => {
    if (preselectedUser?.id) return [preselectedUser]
    const seen = new Set<string>()
    const unique: Pick<User, 'id' | 'name' | 'email'>[] = []
    for (const conv of listingConversations ?? []) {
      const u = conv.user
      if (u && !seen.has(u.id)) {
        seen.add(u.id)
        unique.push({ id: u.id, name: u.name, email: u.email })
      }
    }
    return unique
  }, [preselectedUser, listingConversations])

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      // Sans résa existante, on doit connaître le client cible (le back utilisera
      // `targetUserId`). Avec résa existante, le back a déjà l'userId enregistré.
      if (!existingReservationId && !selectedUserId) {
        throw new Error('Client non sélectionné')
      }

      // 1) Si une Reservation `pending_payment` existe déjà pour ce véhicule
      //    (typiquement : créée par PATCH /listings/:id status=reserved), on
      //    saute la création et on l'utilise. Sinon on crée la résa maintenant.
      const reservationId =
        existingReservationId ??
        (
          await reservationsService.create({
            vehicleId: vehicle.id,
            targetUserId: selectedUserId,
          })
        ).id

      // 2) Générer le lien Stripe Checkout pour cette Reservation
      const session = await paymentsService.createCheckoutSession(reservationId)

      // 3) Retrouver la conversation liée (créée automatiquement côté back)
      const conv = await conversationsService.getReservationConversation(reservationId)

      return {
        reservationId,
        checkoutUrl: session.checkoutUrl,
        expiresAt: session.expiresAt,
        conversationId: conv?.id ?? null,
      }
    },
    onSuccess: (data) => {
      setCheckoutUrl(data.checkoutUrl)
      setExpiresAt(data.expiresAt)
      setConversationId(data.conversationId)
      setMessageText(
        `Bonjour, votre réservation pour la ${vehicle.brand} ${vehicle.model} est prête. Cliquez sur ce lien sécurisé Stripe pour régler la caution de ${depositAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € : ${data.checkoutUrl}\n\nCe lien expire le ${new Date(data.expiresAt).toLocaleString('fr-FR')}.`,
      )
      setStep('link_ready')
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['listing', vehicle.id] })
      toast.success('Lien de paiement Stripe généré')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Erreur inconnue'
      toast.error(`Échec de la génération : ${msg}`)
    },
  })

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error('Conversation introuvable')
      if (!messageText.trim()) throw new Error('Message vide')
      return conversationsService.sendMessage({
        conversationId,
        content: messageText,
        messageType: 'text',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['conversation', conversationId] })
      toast.success('Message envoyé au client')
      onOpenChange(false)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Erreur inconnue'
      toast.error(`Échec de l'envoi : ${msg}`)
    },
  })

  const handleCopyLink = () => {
    if (!checkoutUrl) return
    navigator.clipboard.writeText(checkoutUrl)
    toast.success('Lien copié dans le presse-papier')
  }

  const isSubmittingLink = generateLinkMutation.isPending
  const isSendingMessage = sendMessageMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {step === 'select_client'
              ? 'Réserver pour un client'
              : 'Lien de paiement Stripe prêt'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select_client' ? (
              <>
                {vehicle.brand} {vehicle.model} · Caution{' '}
                <span className="font-medium text-foreground">
                  {depositAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>{' '}
                (5 %)
              </>
            ) : (
              <>Envoyez le lien au client via la conversation liée.</>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'select_client' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="client-select">Client cible</Label>
              {preselectedUser ? (
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
                  <p className="font-medium">{preselectedUser.name}</p>
                  <p className="text-xs text-muted-foreground">{preselectedUser.email}</p>
                </div>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="client-select">
                    <SelectValue placeholder="Choisir un client (via une conv existante)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOptions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Aucune conversation liée à cette annonce — impossible de
                        choisir un client automatiquement.
                      </div>
                    ) : (
                      clientOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <span className="font-medium">{u.name}</span>{' '}
                          <span className="text-xs text-muted-foreground">
                            · {u.email}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                Ce qui se passe ensuite
              </p>
              <ol className="list-decimal pl-4 space-y-0.5">
                {existingReservationId ? (
                  <li>
                    Utilisation de la réservation existante (
                    <span className="font-mono">{existingReservationId.slice(0, 8)}…</span>)
                  </li>
                ) : (
                  <li>Création d'une réservation en attente de paiement</li>
                )}
                <li>Génération d'un lien Stripe Checkout sécurisé</li>
                <li>Envoi du lien au client via la conversation</li>
                <li>Confirmation automatique dès que le client paie</li>
              </ol>
            </div>
          </div>
        )}

        {step === 'link_ready' && checkoutUrl && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Lien Stripe Checkout
                </p>
                {expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    expire{' '}
                    {new Date(expiresAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
              <p className="text-xs font-mono break-all text-foreground/80">
                {checkoutUrl}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(checkoutUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Ouvrir
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="msg-text">
                Message à envoyer{' '}
                {conversationId ? (
                  <span className="text-xs text-muted-foreground">
                    (conv liée détectée)
                  </span>
                ) : (
                  <span className="text-xs text-orange-600">
                    (aucune conv trouvée — envoi manuel requis)
                  </span>
                )}
              </Label>
              <Textarea
                id="msg-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={6}
                className="text-xs font-mono"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select_client' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmittingLink}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => generateLinkMutation.mutate()}
                disabled={
                  (!existingReservationId && !selectedUserId) || isSubmittingLink
                }
              >
                {isSubmittingLink ? 'Génération…' : 'Générer le lien Stripe'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSendingMessage}
              >
                Fermer
              </Button>
              <Button
                type="button"
                onClick={() => sendMessageMutation.mutate()}
                disabled={!conversationId || !messageText.trim() || isSendingMessage}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {isSendingMessage ? 'Envoi…' : 'Envoyer dans la conv'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
