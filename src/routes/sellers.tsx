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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, Plus, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sellersService } from '@/services/sellers.service'
import { useState, useEffect, useMemo } from 'react'

// Composant formulaire d'ajout de vendeur
function AddSellerForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    name: '',
    type: 'particulier' as 'particulier' | 'professionnel',
    location: '',
    phone: '',
    email: '',
    rating: 0,
    verified: false,
  })

  const createMutation = useMutation({
    mutationFn: sellersService.createSeller,
    onSuccess: () => {
      toast.success('Vendeur créé avec succès')
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la création'
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.location) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    createMutation.mutate(formData)
  }

  // Validation de l'email
  const isValidEmail = (email: string) => {
    if (!email) return true // Email optionnel
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isFormValid = formData.name.trim() !== '' &&
                      formData.location.trim() !== '' &&
                      isValidEmail(formData.email)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto overflow-x-hidden px-2 pr-3" style={{ maxHeight: 'calc(90vh - 180px)' }}>
      {/* Nom */}
      <div className="space-y-2">
        <Label htmlFor="seller-name">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="seller-name"
          placeholder="Mario Rossi ou Concessionaria Auto Italia"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={createMutation.isPending}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-2">
          <Label htmlFor="seller-type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'particulier' | 'professionnel') => setFormData({ ...formData, type: value })}
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="seller-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">Particulier</SelectItem>
              <SelectItem value="professionnel">Professionnel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Localisation */}
        <div className="space-y-2">
          <Label htmlFor="seller-location">
            Localisation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="seller-location"
            placeholder="Milan, Rome, Turin..."
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            disabled={createMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="seller-email">Email</Label>
          <Input
            id="seller-email"
            type="email"
            placeholder="contact@vendeur.it"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={createMutation.isPending}
            className={formData.email && !isValidEmail(formData.email) ? "border-destructive" : ""}
          />
          {formData.email && !isValidEmail(formData.email) && (
            <p className="text-xs text-destructive">
              Veuillez saisir une adresse email valide
            </p>
          )}
        </div>

        {/* Téléphone */}
        <div className="space-y-2">
          <Label htmlFor="seller-phone">Téléphone</Label>
          <Input
            id="seller-phone"
            type="tel"
            placeholder="+39 02 1234 5678"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={createMutation.isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Note/Rating */}
        <div className="space-y-2">
          <Label htmlFor="seller-rating">
            Note (0-5)
          </Label>
          <Input
            id="seller-rating"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={formData.rating}
            onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
            disabled={createMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Note moyenne du vendeur (0 à 5 étoiles)
          </p>
        </div>

        {/* Vérifié */}
        <div className="space-y-2">
          <Label htmlFor="seller-verified">Statut</Label>
          <Select
            value={formData.verified ? 'verified' : 'not-verified'}
            onValueChange={(value) => setFormData({ ...formData, verified: value === 'verified' })}
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="seller-verified">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not-verified">Non vérifié</SelectItem>
              <SelectItem value="verified">Vérifié</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background border-t mt-6 -mx-2 px-2 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createMutation.isPending}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid || createMutation.isPending}
        >
          {createMutation.isPending ? 'Création...' : 'Créer le vendeur'}
        </Button>
      </div>
    </form>
  )
}

function SellersPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce pour la recherche - attend 500ms après que l'utilisateur arrête de taper
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: sellers, isLoading, error } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => sellersService.getSellers({ page: 1, limit: 1000 }),
  })

  const deleteMutation = useMutation({
    mutationFn: sellersService.deleteSeller,
    onSuccess: () => {
      toast.success('Vendeur supprimé avec succès')
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    },
  })

  // Filtrage des vendeurs basé sur la recherche
  const filteredSellers = useMemo(() => {
    if (!sellers) return []
    if (!debouncedSearchTerm.trim()) return sellers

    const searchLower = debouncedSearchTerm.toLowerCase().trim()
    return sellers.filter(
      (seller) =>
        seller.name.toLowerCase().includes(searchLower) ||
        seller.location.toLowerCase().includes(searchLower) ||
        seller.type.toLowerCase().includes(searchLower) ||
        (seller.email && seller.email.toLowerCase().includes(searchLower))
    )
  }, [sellers, debouncedSearchTerm])

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Erreur lors du chargement des vendeurs</p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message || 'Erreur de connexion au serveur'}
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const verifiedCount = sellers?.filter((s) => s.verified).length || 0
  const totalVehicles = 0
  const displayedSellers = filteredSellers

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Vendeurs</h2>
            <p className="text-muted-foreground">
              Gérez les vendeurs partenaires en Italie
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un vendeur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Ajouter un vendeur</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau vendeur partenaire au système.
                </DialogDescription>
              </DialogHeader>
              <AddSellerForm onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sellers?.length || 0}</div>
              <p className="text-xs text-muted-foreground">vendeurs partenaires</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vérifiés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedCount}</div>
              <p className="text-xs text-muted-foreground">vendeurs vérifiés</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVehicles}</div>
              <p className="text-xs text-muted-foreground">véhicules disponibles</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des vendeurs</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Chargement...'
                : debouncedSearchTerm
                ? `${displayedSellers.length} résultat${displayedSellers.length > 1 ? 's' : ''} trouvé${displayedSellers.length > 1 ? 's' : ''} sur ${sellers?.length || 0} vendeurs`
                : `${sellers?.length || 0} vendeurs enregistrés`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, localisation, type ou email..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Chargement des vendeurs...</p>
                </div>
              </div>
            ) : displayedSellers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Véhicules</TableHead>
                    <TableHead>Vérifié</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedSellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell>{seller.type}</TableCell>
                      <TableCell>{seller.email || '-'}</TableCell>
                      <TableCell>{seller.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">-</Badge>
                      </TableCell>
                      <TableCell>
                        {seller.verified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={deleteMutation.isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Voir les détails</DropdownMenuItem>
                            <DropdownMenuItem>Modifier</DropdownMenuItem>
                            <DropdownMenuItem>
                              {seller.verified ? 'Retirer la vérification' : 'Vérifier'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`Supprimer ${seller.name} ?`)) {
                                  deleteMutation.mutate(seller.id)
                                }
                              }}
                            >
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {debouncedSearchTerm
                    ? "Aucun vendeur ne correspond à votre recherche"
                    : "Aucun vendeur trouvé"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {debouncedSearchTerm
                    ? "Essayez avec un autre terme de recherche"
                    : "Commencez par ajouter un vendeur partenaire"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/sellers')({
  component: SellersPage,
})
