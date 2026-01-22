import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listingsService } from '@/services/listings.service'
import { quotesService } from '@/services/quotes.service'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return <Badge variant="success">Disponible</Badge>
    case 'reserved':
      return <Badge variant="warning">Réservé</Badge>
    case 'sold':
      return <Badge variant="secondary">Vendu</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function ReservationDetailPage() {
  const { id } = Route.useParams()
  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsService.getListing(id),
  })
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState('details')
  const [agentDocuments, setAgentDocuments] = useState<Array<{ title: string; file: File }>>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDownloadingQuote, setIsDownloadingQuote] = useState(false)

  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!listing?.reservedByUser?.id) {
        throw new Error('missing_user')
      }
      const quote = await quotesService.requestQuote({
        userId: listing.reservedByUser.id,
        vehicleId: listing.id,
      })
      const pdfBlob = await quotesService.getQuotePdf(quote.id)
      return { quote, pdfBlob }
    },
    onSuccess: ({ pdfBlob }) => {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `devis-${listing?.id ?? 'reservation'}.pdf`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setIsDownloadingQuote(false)
    },
    onError: (error: any) => {
      if (error?.message === 'missing_user') {
        toast.error('Aucun client réservataire pour générer le devis.')
        return
      }
      toast.error('Erreur lors de la génération du devis.')
      setIsDownloadingQuote(false)
    },
  })

  useEffect(() => {
    setSelectedImageIndex(0)
  }, [listing?.id])

  const technicalSpecs = useMemo(() => {
    if (!listing) return []
    const specs = [
      {
        label: 'Cylindrée',
        value: listing.engineDisplacement
          ? `${listing.engineDisplacement} cm³`
          : undefined,
      },
      {
        label: 'Moteur',
        value: listing.engineType || undefined,
      },
      {
        label: '0-100 km/h',
        value: listing.acceleration ? `${listing.acceleration} s` : undefined,
      },
      {
        label: 'Vitesse max',
        value: listing.topSpeed ? `${listing.topSpeed} km/h` : undefined,
      },
      {
        label: 'Consommation',
        value: listing.consumption ? `${listing.consumption} L/100km` : undefined,
      },
      {
        label: 'CO2',
        value: listing.co2 ? `${listing.co2} g/km` : undefined,
      },
    ]
    return specs.filter((item) => item.value !== undefined && item.value !== '')
  }, [listing])

  const formatTechnicalLabel = (label: string) => {
    const map: Record<string, string> = {
      motor: 'Moteur',
      doors: 'Portes',
      moteur: 'Moteur',
      portes: 'Portes',
      cylindree: 'Cylindrée',
    }
    return map[label] || label
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading || !listing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/reservations">Réservations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {listing.brand} {listing.model}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{listing.brand}</p>
            <h2 className="text-3xl font-bold tracking-tight">
              {listing.brand} {listing.model} · {listing.year}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(listing.status)}
              <Badge variant="outline">{listing.fuelType}</Badge>
              <Badge variant="outline">{listing.transmission}</Badge>
              <Badge variant="secondary">{listing.sellerType}</Badge>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Prix</p>
              <p className="text-2xl font-semibold">
                {listing.price.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Coût import</p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {listing.importCost.toLocaleString('fr-FR')} €
              </p>
            </div>
            <Button
              type="button"
              className="sm:col-span-2"
              onClick={() => {
                if (quoteMutation.isPending || isDownloadingQuote) return
                setIsDownloadingQuote(true)
                quoteMutation.mutate()
              }}
            >
              {quoteMutation.isPending || isDownloadingQuote
                ? 'Génération...'
                : 'Générer un devis'}
            </Button>
          </div>
        </div>

        <Tabs
          defaultValue="details"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="details">Détail</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            {activeTab === 'documents' && (
              <Button type="button" onClick={() => setIsUploadOpen(true)}>
                Déposer un document
              </Button>
            )}
          </div>

          <TabsContent value="details">
            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] items-start">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-muted/50">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[Math.min(selectedImageIndex, listing.images.length - 1)]}
                      alt={`${listing.brand} ${listing.model}`}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
                      Aucune image disponible
                    </div>
                  )}
                </div>

                {listing.images && listing.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.images.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`overflow-hidden rounded-md border bg-muted/50 transition ${
                          index === selectedImageIndex
                            ? 'ring-2 ring-primary'
                            : 'hover:ring-2 hover:ring-primary/50'
                        }`}
                        aria-label={`Voir image ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt={`Aperçu ${index + 1}`}
                          className="h-20 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {listing.description && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Description</p>
                    <p className="leading-relaxed text-sm">{listing.description}</p>
                  </div>
                )}

                {listing.equipment && listing.equipment.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Équipements</p>
                    <div className="flex flex-wrap gap-2">
                      {listing.equipment.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {technicalSpecs.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Fiche technique</p>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {technicalSpecs.map((spec) => (
                        <div key={spec.label} className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">{spec.label}</p>
                          <p className="font-medium">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {listing.technicalData && Object.keys(listing.technicalData).length > 0 && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Données techniques</p>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {Object.entries(listing.technicalData).map(([label, value]) => (
                        <div key={label} className="rounded border px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            {formatTechnicalLabel(label)}
                          </p>
                          <p className="font-medium">{value as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 lg:sticky lg:top-6">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Résumé</p>
                  <div className="mt-3 grid gap-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Kilométrage</span>
                      <span className="font-medium">
                        {listing.mileage.toLocaleString('fr-FR')} km
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Puissance</span>
                      <span className="font-medium">{listing.power || '—'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Localisation</span>
                      <span className="font-medium">{listing.location}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground">Créé le</span>
                      <span className="font-medium">
                        {new Date(listing.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                {listing.seller && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendeur</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="font-medium">{listing.seller.name}</p>
                      <p className="text-muted-foreground">
                        {listing.seller.type === 'professionnel' ? 'Professionnel' : 'Particulier'} ·{' '}
                        {listing.seller.location}
                      </p>
                      {(listing.seller.phone || listing.seller.email) && (
                        <p className="text-muted-foreground">
                          {[listing.seller.phone, listing.seller.email].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {listing.reservedByUser && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="font-medium">{listing.reservedByUser.name}</p>
                      <p className="text-muted-foreground">{listing.reservedByUser.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Documents du client
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Aucun document pour le moment.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Documents de l'agent
                </p>
                <div className="mt-3 space-y-3">
                  {agentDocuments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun document pour le moment.
                    </p>
                ) : (
                    <div className="space-y-2">
                      {agentDocuments.map((doc, index) => (
                        <div
                          key={`${doc.file.name}-${index}`}
                          className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file.name} · {(doc.file.size / 1024).toFixed(1)} Ko
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAgentDocuments((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Retirer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Déposer un document</DialogTitle>
              <DialogDescription>
                Ajoutez un titre et choisissez un fichier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre</label>
                <Input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Ex: Devis d'importation"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier</label>
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-sm transition ${
                    draftFile
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : isDragging
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted-foreground/30 bg-muted/20'
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDragging(false)
                    const file = event.dataTransfer.files?.[0]
                    if (file) {
                      setDraftFile(file)
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="font-medium">
                      Glissez-déposez un fichier ici
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ou cliquez pour sélectionner
                    </p>
                  </div>
                  <label
                    htmlFor="agent-document-file"
                    className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Choisir un fichier
                  </label>
                  <input
                    id="agent-document-file"
                    type="file"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null
                      setDraftFile(file)
                      event.currentTarget.value = ''
                    }}
                  />
                  {draftFile ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {draftFile.name} · {(draftFile.size / 1024).toFixed(1)} Ko
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Aucun fichier sélectionné
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUploadOpen(false)
                    setDraftTitle('')
                    setDraftFile(null)
                  }}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={!draftTitle.trim() || !draftFile}
                  onClick={() => {
                    if (!draftFile) return
                    setAgentDocuments((prev) => [
                      ...prev,
                      { title: draftTitle.trim(), file: draftFile },
                    ])
                    setDraftTitle('')
                    setDraftFile(null)
                    setIsUploadOpen(false)
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/reservations/$id')({
  component: ReservationDetailPage,
})
