import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, Check, X, Trash2 } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { DocumentUpload } from './document-upload'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ListingDocumentsProps {
  listingId: string
  vehicleStatus?: 'available' | 'reserved' | 'sold'
  compact?: boolean // Pour un affichage plus compact dans les modals
  /**
   * Si fourni, le composant bascule en mode "docs privés à la conversation" :
   * - fetch : GET /documents?conversationId={conversationId}
   * - upload : formData.conversationId au lieu de formData.listingId
   * Le listingId reste utilisé côté UI (badge annonce liée / contexte) mais
   * n'intervient plus dans les requêtes docs.
   */
  conversationId?: string
  /**
   * Filtre par catégorie côté client (après fetch). Utile pour scoper la
   * modale annonce aux seuls "docs officiels" (admin_provided) et masquer
   * les justificatifs uploadés par un client — qui appartiennent
   * sémantiquement à la conv, pas à l'annonce.
   *
   * Par défaut : pas de filtre (les 2 catégories affichées).
   */
  categoryFilter?: 'user_uploaded' | 'admin_provided'
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">En attente</Badge>
    case 'validated':
      return <Badge variant="success">Validé</Badge>
    case 'rejected':
      return <Badge variant="destructive">Rejeté</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    carte_identite: 'Carte d\'identité',
    justificatif_domicile: 'Justificatif de domicile',
    carte_grise_italienne: 'Carte grise italienne',
    acte_vente: 'Acte de vente',
    facture: 'Facture',
    quitus_fiscal: 'Quitus fiscal',
    certificat_conformite: 'Certificat de conformité',
    controle_technique_fr: 'Contrôle technique FR',
    immatriculation_fr: 'Immatriculation FR',
    other: 'Autre',
  }
  return labels[type] || type
}

export function ListingDocuments({
  listingId,
  vehicleStatus,
  compact = false,
  conversationId,
  categoryFilter,
}: ListingDocumentsProps) {
  const queryClient = useQueryClient()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const isReserved = vehicleStatus === 'reserved'

  // Deux modes : "docs de la conv" (privé) vs "docs de l'annonce" (partagé).
  // La queryKey diffère → les 2 caches coexistent sans se marcher dessus.
  const isConvMode = Boolean(conversationId)
  const queryKey = isConvMode
    ? (['documents', 'conversation', conversationId] as const)
    : (['documents', 'listing', listingId] as const)

  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      isConvMode
        ? documentsService.getConversationDocuments(conversationId!)
        : documentsService.getListingDocuments(listingId),
  })

  // Filtre côté client : masque les docs qui n'appartiennent pas au bucket
  // sémantique attendu par le parent (ex: modale annonce ne veut voir que
  // les docs admin_provided, pas les user_uploaded orphelins).
  const documents = categoryFilter
    ? allDocuments.filter((d) => d.category === categoryFilter)
    : allDocuments

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const validateMutation = useMutation({
    mutationFn: documentsService.validateDocument,
    onSuccess: () => {
      toast.success('Document validé')
      invalidate()
    },
  })

  const rejectMutation = useMutation({
    mutationFn: documentsService.rejectDocument,
    onSuccess: () => {
      toast.success('Document rejeté')
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: documentsService.deleteDocument,
    onSuccess: () => {
      toast.success('Document supprimé')
      invalidate()
    },
  })

  const handleDownload = async (documentId: string) => {
    try {
      await documentsService.openDocument(documentId)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement')
    }
  }

  // Séparer les documents par catégorie
  const userDocuments = documents.filter((doc) => doc.category === 'user_uploaded')
  const adminDocuments = documents.filter((doc) => doc.category === 'admin_provided')

  const renderDocumentList = (docs: typeof documents) => {
    if (docs.length === 0) {
      return (
        <div className="text-center py-3 text-muted-foreground">
          <p className="text-xs">Aucun document pour le moment.</p>
        </div>
      )
    }

    if (compact) {
      // Affichage compact pour les modals
      return (
        <div className="space-y-2">
          {docs.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs truncate">{document.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {getTypeLabel(document.type)}
                    </span>
                    {document.fileSize && (
                      <span className="text-[10px] text-muted-foreground">
                        · {(document.fileSize / 1024).toFixed(1)} KB
                      </span>
                    )}
                    {/* Tag inline "Client" ou "Strada" : permet de garder
                        l'info d'auteur sans les sous-titres qui écrasaient
                        le contexte parent. */}
                    <span
                      className={`text-[9px] uppercase tracking-wide px-1 py-px rounded ${
                        document.category === 'user_uploaded'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {document.category === 'user_uploaded' ? 'Client' : 'Strada'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="scale-75 origin-right">
                  {getStatusBadge(document.status)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(document.id)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {document.status === 'pending' && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => validateMutation.mutate(document.id)}
                      disabled={validateMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => rejectMutation.mutate(document.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
                      deleteMutation.mutate(document.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )
    }

    // Affichage normal
    return (
      <div className="space-y-2.5">
        {docs.map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{document.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {getTypeLabel(document.type)}
                  </span>
                  {document.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      · {(document.fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {getStatusBadge(document.status)}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(document.id)}
              >
                <Download className="h-4 w-4" />
              </Button>
              {document.status === 'pending' && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => validateMutation.mutate(document.id)}
                    disabled={validateMutation.isPending}
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => rejectMutation.mutate(document.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
                    deleteMutation.mutate(document.id)
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Si l'annonce n'est pas réservée, ne pas afficher les documents
  if (!isReserved) {
    return null
  }

  const content = (
    <>
      {isLoading ? (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">Chargement...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className={`${compact ? 'h-8 w-8' : 'h-10 w-10'} mx-auto mb-2 opacity-50`} />
          <p className={compact ? 'text-xs' : 'text-sm'}>Aucun document</p>
        </div>
      ) : compact ? (
        /*
          Mode compact (sidebar conv, modal fiche annonce) :
          liste plate, sans sous-titres "client / agent" qui répétaient le
          contexte parent (déjà indiqué par le titre "Docs de l'annonce"
          ou "Justificatifs échangés"). L'auteur est signalé inline par un
          petit tag "Client" / "Strada" sur chaque item.
        */
        renderDocumentList(documents)
      ) : (
        /*
          Mode normal (page dédiée) : 2 colonnes distinctes pour le tri
          "envoyés par le client" vs "fournis par Strada" — utile en vue
          plein écran où on a la place.
        */
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Envoyés par le client
            </p>
            {renderDocumentList(userDocuments)}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
              Fournis par Strada
            </p>
            {renderDocumentList(adminDocuments)}
          </div>
        </div>
      )}
    </>
  )

  if (compact) {
    // Affichage compact sans Card pour les modals
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Documents</p>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <FileText className="h-3 w-3 mr-1.5" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
                <DialogDescription>
                  Uploader un document lié à cette annonce
                </DialogDescription>
              </DialogHeader>
              <DocumentUpload
                listingId={isConvMode ? undefined : listingId}
                conversationId={conversationId}
                onUploadSuccess={() => {
                  setUploadDialogOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
        {content}
      </div>
    )
  }

  // Affichage normal avec Card
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Ajouter un document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document</DialogTitle>
                <DialogDescription>
                  Uploader un document lié à cette annonce
                </DialogDescription>
              </DialogHeader>
              <DocumentUpload
                listingId={isConvMode ? undefined : listingId}
                conversationId={conversationId}
                onUploadSuccess={() => {
                  setUploadDialogOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  )
}

