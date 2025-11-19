import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { Search, Upload, FileText, Check, X, Download } from 'lucide-react'
import { documentsService } from '@/services/documents.service'

const getStatusBadge = (status: string) => {
  const badges = {
    pending: <Badge variant="warning">En attente</Badge>,
    validated: <Badge variant="success">Validé</Badge>,
    rejected: <Badge variant="destructive">Rejeté</Badge>,
  }
  return badges[status as keyof typeof badges] || <Badge>{status}</Badge>
}

const getTypeLabel = (type: string) => {
  const labels = {
    invoice: 'Facture',
    registration: 'Immatriculation',
    insurance: 'Assurance',
    customs: 'Douane',
    other: 'Autre',
  }
  return labels[type as keyof typeof labels] || type
}

function DocumentsPage() {
  const queryClient = useQueryClient()

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.getDocuments(),
  })

  const validateMutation = useMutation({
    mutationFn: documentsService.validateDocument,
    onSuccess: () => {
      toast.success('Document validé')
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: documentsService.rejectDocument,
    onSuccess: () => {
      toast.success('Document rejeté')
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur')
    },
  })

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des documents</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const pendingCount = documents?.filter((d) => d.status === 'pending').length || 0
  const validatedCount = documents?.filter((d) => d.status === 'validated').length || 0

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Documents</h2>
            <p className="text-muted-foreground">
              Gérez les documents d'importation
            </p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Ajouter un document
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents?.length || 0}</div>
              <p className="text-xs text-muted-foreground">documents</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">à valider</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{validatedCount}</div>
              <p className="text-xs text-muted-foreground">approuvés</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des documents</CardTitle>
            <CardDescription>
              {isLoading ? 'Chargement...' : `${documents?.length || 0} documents`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un document..."
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des documents...</p>
                </div>
              </div>
            ) : documents && documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Taille</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {document.name}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeLabel(document.type)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {document.fileSize
                          ? `${(document.fileSize / 1024).toFixed(1)} KB`
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {document.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => validateMutation.mutate(document.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => rejectMutation.mutate(document.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun document</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les documents d'importation apparaîtront ici
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/documents')({
  component: DocumentsPage,
})
