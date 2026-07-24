import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDown } from 'lucide-react'
import { quotesService } from '@/services/quotes.service'
import { conversationsService } from '@/services/conversations.service'
import type { Conversation, User, Vehicle } from '@/types'

interface GenerateQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  /** Véhicule concerné par le devis. */
  vehicle: Pick<Vehicle, 'id' | 'brand' | 'model'>

  /**
   * Client cible pré-sélectionné (typiquement : `reservedByUser` de l'annonce,
   * ou `conversation.user` depuis la sidebar conv). Si non fourni, l'utilisateur
   * choisit parmi les convs du listing.
   */
  preselectedUser?: Pick<User, 'id' | 'name' | 'email'> | null
}

/**
 * Modal réutilisable pour générer un devis PDF depuis l'admin.
 *
 * Utilisable depuis :
 * - la fiche annonce (/listings/$id) — bouton "Générer devis"
 * - la sidebar d'une conversation — bouton "Générer devis pour ce client"
 *
 * Workflow :
 * 1. Résout un client cible : `preselectedUser` si fourni, sinon liste des convs du listing
 * 2. Demande la ville de destination (défaut "Paris")
 * 3. POST /quotes/request avec targetUserId + cityDestination + vehicleId
 * 4. GET /quotes/:id/pdf → download automatique
 */
export function GenerateQuoteDialog({
  open,
  onOpenChange,
  vehicle,
  preselectedUser,
}: GenerateQuoteDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(preselectedUser?.id ?? '')
  const [cityDestination, setCityDestination] = useState<string>('Paris')

  // Reset des champs à chaque ouverture / changement de contexte
  useEffect(() => {
    if (open) {
      setSelectedUserId(preselectedUser?.id ?? '')
      setCityDestination('Paris')
    }
  }, [open, preselectedUser?.id])

  // Fallback : liste des clients qui ont une conv sur ce listing.
  // Chargée uniquement si aucun preselectedUser (le sélecteur reste caché sinon).
  const { data: listingConversations = [] } = useQuery({
    queryKey: ['conversations', 'listing', vehicle.id],
    queryFn: () => conversationsService.getListingConversations(vehicle.id),
    enabled: open && !preselectedUser,
  })

  // Déduplique par userId — un même client peut avoir plusieurs convs
  const clientChoices = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; label: string }[] = []
    for (const c of listingConversations as Conversation[]) {
      if (!c.user || seen.has(c.user.id)) continue
      seen.add(c.user.id)
      out.push({ id: c.user.id, label: c.user.name || c.user.email || c.user.id })
    }
    return out
  }, [listingConversations])

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const quote = await quotesService.requestQuote({
        targetUserId: selectedUserId,
        cityDestination: cityDestination.trim(),
        vehicleId: vehicle.id,
      })
      const pdfBlob = await quotesService.getQuotePdf(quote.id)
      return { quote, pdfBlob }
    },
    onSuccess: ({ pdfBlob }) => {
      // Ouvre le PDF en preview dans un nouvel onglet plutôt que de
      // forcer le download. `link.download = …` (retiré) écrasait
      // Content-Disposition=inline renvoyé par le back et forçait le
      // téléchargement local. window.open + target=_blank laisse le
      // browser afficher le viewer PDF natif ; le user peut toujours
      // sauver depuis ce viewer si besoin. Bogdan 2026-07-24.
      const url = URL.createObjectURL(pdfBlob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      toast.success('Devis généré')
      onOpenChange(false)
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Erreur lors de la génération du devis.'
      toast.error(message)
    },
  })

  const canSubmit = Boolean(selectedUserId) && cityDestination.trim().length > 0 && !quoteMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Générer un devis</DialogTitle>
          <DialogDescription>
            Pour <span className="font-medium">{vehicle.brand} {vehicle.model}</span>.
            Le PDF est téléchargé automatiquement à la fin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="target-user">Client cible</Label>
            {preselectedUser ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{preselectedUser.name}</div>
                <div className="text-xs text-muted-foreground">{preselectedUser.email}</div>
              </div>
            ) : clientChoices.length > 0 ? (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="target-user">
                  <SelectValue placeholder="Choisir un client…" />
                </SelectTrigger>
                <SelectContent>
                  {clientChoices.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                Aucune conversation liée à cette annonce pour l'instant. Ouvrez ou créez une conversation avec le client puis relancez la génération depuis là.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city-destination">Ville de livraison</Label>
            <Input
              id="city-destination"
              placeholder="Paris"
              value={cityDestination}
              onChange={(e) => setCityDestination(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Utilisée pour le calcul transport + péages depuis l'Italie.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={quoteMutation.isPending}>
            Annuler
          </Button>
          <Button onClick={() => quoteMutation.mutate()} disabled={!canSubmit}>
            <FileDown className="mr-2 h-4 w-4" />
            {quoteMutation.isPending ? 'Génération…' : 'Générer & télécharger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
