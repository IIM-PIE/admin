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

export function ListingDocuments({ listingId }: ListingDocumentsProps) {
  const queryClient = useQueryClient()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', 'listing', listingId],
    queryFn: () => documentsService.getListingDocuments(listingId),
  })

  const validateMutation = useMutation({
    mutationFn: documentsService.validateDocument,
    onSuccess: () => {
      toast.success('Document validé')
      queryClient.invalidateQueries({ queryKey: ['documents', 'listing', listingId] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: documentsService.rejectDocument,
    onSuccess: () => {
      toast.success('Document rejeté')
      queryClient.invalidateQueries({ queryKey: ['documents', 'listing', listingId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: documentsService.deleteDocument,
    onSuccess: () => {
      toast.success('Document supprimé')
      queryClient.invalidateQueries({ queryKey: ['documents', 'listing', listingId] })
    },
  })

  const handleDownload = async (documentId: string) => {
    try {
      const { url } = await documentsService.getDownloadUrl(documentId)
      window.open(url, '_blank')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors du téléchargement')
    }
  }

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
                listingId={listingId}
                onUploadSuccess={() => {
                  setUploadDialogOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Chargement...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun document</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{document.name}</p>
                    <div className="flex items-center gap-2 mt-1">
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
                <div className="flex items-center gap-2">
                  {getStatusBadge(document.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(document.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {document.status === 'pending' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => validateMutation.mutate(document.id)}
                        disabled={validateMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
        )}
      </CardContent>
    </Card>
  )
}

