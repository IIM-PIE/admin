import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { Upload, X, FileText, Loader2 } from 'lucide-react'
import { documentsService } from '@/services/documents.service'
import { useAuth } from '@/contexts/auth-context'
import type { DocumentType } from '@/types'
import { cn } from '@/lib/utils'

interface DocumentUploadProps {
  listingId: string
  onUploadSuccess?: () => void
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'carte_identite', label: 'Carte d\'identité' },
  { value: 'justificatif_domicile', label: 'Justificatif de domicile' },
  { value: 'carte_grise_italienne', label: 'Carte grise italienne' },
  { value: 'acte_vente', label: 'Acte de vente' },
  { value: 'facture', label: 'Facture' },
  { value: 'quitus_fiscal', label: 'Quitus fiscal' },
  { value: 'certificat_conformite', label: 'Certificat de conformité' },
  { value: 'controle_technique_fr', label: 'Contrôle technique FR' },
  { value: 'immatriculation_fr', label: 'Immatriculation FR' },
  { value: 'other', label: 'Autre' },
]

export function DocumentUpload({ listingId, onUploadSuccess }: DocumentUploadProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('carte_grise_italienne')
  const [documentName, setDocumentName] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  // Récupérer l'ID utilisateur (peut être dans 'id' ou 'sub' selon le format)
  const userId = user?.id || (user as any)?.sub

  const uploadMutation = useMutation({
    mutationFn: async (fileToUpload: File) => {
      // Récupérer l'ID utilisateur (peut être dans 'id' ou 'sub' selon le format)
      const currentUserId = user?.id || (user as any)?.sub
      
      console.log('Début upload document:', { 
        fileName: fileToUpload.name, 
        fileSize: fileToUpload.size,
        listingId,
        userId: currentUserId,
        documentType,
        documentName: documentName || fileToUpload.name,
        user,
        isLoading,
      })
      
      if (isLoading) {
        console.error('Erreur: Chargement de l\'utilisateur en cours')
        throw new Error('Chargement de l\'utilisateur en cours, veuillez réessayer')
      }
      
      if (!currentUserId) {
        console.error('Erreur: Utilisateur non connecté', { 
          user, 
          userId: currentUserId,
          isLoading,
        })
        throw new Error('Utilisateur non connecté. Veuillez vous reconnecter.')
      }
      
      try {
        const result = await documentsService.uploadDocument(fileToUpload, {
          userId: currentUserId,
          listingId,
          type: documentType,
          category: 'admin_provided',
          name: documentName || fileToUpload.name,
          required: false,
        })
        console.log('Upload réussi:', result)
        return result
      } catch (error) {
        console.error('Erreur dans uploadDocument:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success('Document uploadé avec succès')
      setFile(null)
      setDocumentName('')
      queryClient.invalidateQueries({ queryKey: ['documents', 'listing', listingId] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      onUploadSuccess?.()
    },
    onError: (error: any) => {
      console.error('Erreur upload document:', error)
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Erreur lors de l\'upload du document'
      toast.error(errorMessage)
    },
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      // Valider le type de fichier
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(droppedFile.type)) {
        toast.error('Format de fichier non supporté. Formats acceptés : PDF, JPEG, PNG, DOC, DOCX')
        return
      }
      
      // Valider la taille (10MB max)
      if (droppedFile.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10MB)')
        return
      }
      
      setFile(droppedFile)
      if (!documentName) {
        setDocumentName(droppedFile.name)
      }
    }
  }, [documentName])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Valider le type de fichier
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Format de fichier non supporté. Formats acceptés : PDF, JPEG, PNG, DOC, DOCX')
        return
      }
      
      // Valider la taille
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 10MB)')
        return
      }
      
      setFile(selectedFile)
      if (!documentName) {
        setDocumentName(selectedFile.name)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Veuillez sélectionner un fichier')
      return
    }
    uploadMutation.mutate(file)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Zone de drag & drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          file && 'border-primary bg-primary/5'
        )}
      >
        {file ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary hover:underline">
                  Cliquez pour uploader
                </span>
                {' ou glissez-déposez un fichier'}
              </Label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PDF, JPEG, PNG, DOC, DOCX (max 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Type de document */}
      <div className="space-y-2">
        <Label>Type de document</Label>
        <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nom du document */}
      <div className="space-y-2">
        <Label>Nom du document</Label>
        <Input
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder={file?.name || 'Nom du document'}
        />
      </div>

      {/* Bouton d'upload */}
      <Button
        type="submit"
        disabled={!file || uploadMutation.isPending || (isLoading && !userId) || (!isLoading && !userId && !isAuthenticated)}
        className="w-full"
      >
        {isLoading && !userId ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : uploadMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Upload en cours...
          </>
        ) : !userId && !isAuthenticated ? (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Utilisateur non connecté
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Uploader le document
          </>
        )}
      </Button>
    </form>
  )
}

