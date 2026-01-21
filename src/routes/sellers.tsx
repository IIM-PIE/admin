import { createFileRoute, redirect } from '@tanstack/react-router'
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
import { authService } from '@/services/auth.service'
import type { Seller } from '@/types'
import { useState, useEffect, useMemo } from 'react'
import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input'
import en from 'react-phone-number-input/locale/en.json'
import { getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/mobile/examples'

const getCountryFlag = (countryCode: string): string => {
  if (!countryCode) return ''
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const getPhonePlaceholder = (countryCode: string): string => {
  try {
    const exampleNumber = getExampleNumber(countryCode as any, examples)
    if (exampleNumber) {
      return exampleNumber.formatNational()
    }
  } catch (e) {
    // Fallback si pas d'exemple disponible
  }
  return '612 34 56 78'
}

const getMaxPhoneLength = (countryCode: string): number => {
  try {
    const exampleNumber = getExampleNumber(countryCode as any, examples)
    if (exampleNumber) {
      const nationalNumber = exampleNumber.nationalNumber
      return nationalNumber.length
    }
  } catch (e) {
    // Fallback
  }
  return 15
}

// Composant formulaire d'ajout de vendeur
function AddSellerForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [selectedCountry, setSelectedCountry] = useState<string>('FR')
  const [phoneNumber, setPhoneNumber] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'particulier' as 'particulier' | 'professionnel',
    location: '',
    phone: '',
    email: '',
    verified: false,
  })

  const countryCode = selectedCountry
    ? `+${getCountryCallingCode(selectedCountry as any)}`
    : ''

  const maxLength = getMaxPhoneLength(selectedCountry)

  useEffect(() => {
    if (phoneNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        phone: countryCode + phoneNumber.replace(/\s/g, ''),
      }))
    } else {
      setFormData(prev => ({ ...prev, phone: '' }))
    }
  }, [selectedCountry, phoneNumber, countryCode])

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
    if (!isValidEmail(formData.email)) {
      toast.error('Veuillez saisir une adresse email valide')
      return
    }
    if (!isValidPhone()) {
      toast.error('Veuillez saisir un numéro de téléphone valide')
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

  const isValidPhone = () => {
    if (!phoneNumber.trim()) return true
    const numbers = phoneNumber.replace(/\D/g, '')
    return numbers.length >= 6 && numbers.length <= maxLength
  }

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s]/g, '')
    const digitsOnly = cleaned.replace(/\D/g, '')

    if (digitsOnly.length <= maxLength) {
      setPhoneNumber(cleaned)
    }
  }

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.location.trim() !== '' &&
    isValidEmail(formData.email) &&
    isValidPhone()

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
          <div className="flex gap-2">
            <Select
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              disabled={createMutation.isPending}
            >
            <SelectTrigger className="w-[84px]">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{countryCode}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {getCountries().map((country) => (
                  <SelectItem key={country} value={country}>
                    <span className="flex items-center gap-2">
                      <span>{getCountryFlag(country)}</span>
                      <span className="font-medium">
                        +{getCountryCallingCode(country)}
                      </span>
                      <span className="text-muted-foreground">
                        - {en[country]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="seller-phone"
              type="tel"
              placeholder={getPhonePlaceholder(selectedCountry)}
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              disabled={createMutation.isPending}
              className="flex-1"
            />
          </div>
          {phoneNumber && !isValidPhone() && (
            <p className="text-xs text-destructive">
              Le numéro doit contenir entre 6 et {maxLength} chiffres pour ce pays
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

// Composant formulaire d'édition de vendeur
function EditSellerForm({
  seller,
  onClose,
}: {
  seller: Seller
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selectedCountry, setSelectedCountry] = useState<string>('FR')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [formData, setFormData] = useState({
    name: seller.name || '',
    type: seller.type || ('particulier' as 'particulier' | 'professionnel'),
    location: seller.location || '',
    phone: seller.phone || '',
    email: seller.email || '',
    verified: seller.verified ?? false,
  })

  useEffect(() => {
    if (seller.phone) {
      const phoneStr = seller.phone
      const countries = getCountries()

      for (const country of countries) {
        const code = `+${getCountryCallingCode(country as any)}`
        if (phoneStr.startsWith(code)) {
          setSelectedCountry(country)
          const restOfNumber = phoneStr.substring(code.length)
          setPhoneNumber(restOfNumber)
          break
        }
      }
    } else {
      setPhoneNumber('')
    }
  }, [seller.phone])

  const countryCode = selectedCountry
    ? `+${getCountryCallingCode(selectedCountry as any)}`
    : ''

  const maxLength = getMaxPhoneLength(selectedCountry)

  useEffect(() => {
    if (phoneNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        phone: countryCode + phoneNumber.replace(/\s/g, ''),
      }))
    } else {
      setFormData(prev => ({ ...prev, phone: '' }))
    }
  }, [selectedCountry, phoneNumber, countryCode])

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Seller>) =>
      sellersService.updateSeller(seller.id, payload),
    onSuccess: () => {
      toast.success('Vendeur mis à jour avec succès')
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erreur lors de la mise à jour'
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.location) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    if (!isValidEmail(formData.email)) {
      toast.error('Veuillez saisir une adresse email valide')
      return
    }
    if (!isValidPhone()) {
      toast.error('Veuillez saisir un numéro de téléphone valide')
      return
    }

    updateMutation.mutate(formData)
  }

  const isValidEmail = (email: string) => {
    if (!email) return true
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = () => {
    if (!phoneNumber.trim()) return true
    const numbers = phoneNumber.replace(/\D/g, '')
    return numbers.length >= 6 && numbers.length <= maxLength
  }

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s]/g, '')
    const digitsOnly = cleaned.replace(/\D/g, '')

    if (digitsOnly.length <= maxLength) {
      setPhoneNumber(cleaned)
    }
  }

  const isFormValid =
    formData.name.trim() !== '' &&
    formData.location.trim() !== '' &&
    isValidEmail(formData.email) &&
    isValidPhone()

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 overflow-y-auto overflow-x-hidden px-2 pr-3"
      style={{ maxHeight: 'calc(90vh - 180px)' }}
    >
      <div className="space-y-2">
        <Label htmlFor="seller-name-edit">
          Nom <span className="text-destructive">*</span>
        </Label>
        <Input
          id="seller-name-edit"
          placeholder="Mario Rossi ou Concessionaria Auto Italia"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={updateMutation.isPending}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seller-type-edit">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'particulier' | 'professionnel') =>
              setFormData({ ...formData, type: value })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="seller-type-edit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">Particulier</SelectItem>
              <SelectItem value="professionnel">Professionnel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-location-edit">
            Localisation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="seller-location-edit"
            placeholder="Milan, Rome, Turin..."
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            disabled={updateMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seller-email-edit">Email</Label>
          <Input
            id="seller-email-edit"
            type="email"
            placeholder="contact@vendeur.it"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={updateMutation.isPending}
            className={formData.email && !isValidEmail(formData.email) ? "border-destructive" : ""}
          />
          {formData.email && !isValidEmail(formData.email) && (
            <p className="text-xs text-destructive">
              Veuillez saisir une adresse email valide
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="seller-phone-edit">Téléphone</Label>
          <div className="flex gap-2">
            <Select
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className="w-[84px]">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{countryCode}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {getCountries().map((country) => (
                  <SelectItem key={country} value={country}>
                    <span className="flex items-center gap-2">
                      <span>{getCountryFlag(country)}</span>
                      <span className="font-medium">
                        +{getCountryCallingCode(country)}
                      </span>
                      <span className="text-muted-foreground">
                        - {en[country]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="seller-phone-edit"
              type="tel"
              placeholder={getPhonePlaceholder(selectedCountry)}
              value={phoneNumber}
              onChange={(e) => handlePhoneNumberChange(e.target.value)}
              disabled={updateMutation.isPending}
              className="flex-1"
            />
          </div>
          {phoneNumber && !isValidPhone() && (
            <p className="text-xs text-destructive">
              Le numéro doit contenir entre 6 et {maxLength} chiffres pour ce pays
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="seller-verified-edit">Statut</Label>
          <Select
            value={formData.verified ? 'verified' : 'not-verified'}
            onValueChange={(value) =>
              setFormData({ ...formData, verified: value === 'verified' })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="seller-verified-edit">
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
          disabled={updateMutation.isPending}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid || updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Mise à jour...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}

function SellersPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null)
  const [deleteSeller, setDeleteSeller] = useState<Seller | null>(null)
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
      setDeleteSeller(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: (payload: { id: string; verified: boolean }) =>
      sellersService.updateSeller(payload.id, { verified: payload.verified }),
    onSuccess: () => {
      toast.success('Statut de vérification mis à jour')
      queryClient.invalidateQueries({ queryKey: ['sellers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour')
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
  const displayedSellers = filteredSellers

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-2">
              <CardTitle>Liste des vendeurs</CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Chargement...'
                  : debouncedSearchTerm
                  ? `${displayedSellers.length} résultat${displayedSellers.length > 1 ? 's' : ''} trouvé${displayedSellers.length > 1 ? 's' : ''} sur ${sellers?.length || 0} vendeurs`
                  : `${sellers?.length || 0} vendeurs enregistrés`}
              </CardDescription>
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
                            <DropdownMenuItem onSelect={() => setSelectedSeller(seller)}>
                              Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditingSeller(seller)}>
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                verifyMutation.mutate({
                                  id: seller.id,
                                  verified: !seller.verified,
                                })
                              }
                              disabled={verifyMutation.isPending}
                            >
                              {seller.verified ? 'Retirer la vérification' : 'Vérifier'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setDeleteSeller(seller)}
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

      <Dialog
        open={!!selectedSeller}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSeller(null)
          }
        }}
      >
        {selectedSeller && (
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-1">
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedSeller.type === 'professionnel' ? 'Professionnel' : 'Particulier'}
                </span>
                <span className="text-2xl font-semibold leading-tight">
                  {selectedSeller.name}
                </span>
              </DialogTitle>
              <DialogDescription>
                Détails complets du vendeur sélectionné.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedSeller.verified ? 'success' : 'secondary'}>
                  {selectedSeller.verified ? 'Vérifié' : 'Non vérifié'}
                </Badge>
                <Badge variant="outline">{selectedSeller.type}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Localisation</p>
                  <p className="text-lg font-semibold">{selectedSeller.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Téléphone</p>
                  <p className="text-lg font-semibold">
                    {selectedSeller.phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold">
                    {selectedSeller.email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Créé le</p>
                  <p className="text-lg font-semibold">
                    {new Date(selectedSeller.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!editingSeller}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSeller(null)
          }
        }}
      >
        {editingSeller && (
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Modifier le vendeur</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de {editingSeller.name}.
              </DialogDescription>
            </DialogHeader>
            <EditSellerForm
              seller={editingSeller}
              onClose={() => setEditingSeller(null)}
            />
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!deleteSeller}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSeller(null)
          }
        }}
      >
        {deleteSeller && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Supprimer le vendeur</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Confirmez la suppression de{' '}
                <span className="font-semibold">{deleteSeller.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium capitalize">{deleteSeller.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Localisation</span>
                  <span className="font-medium">{deleteSeller.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <span className="font-medium">
                    {deleteSeller.verified ? 'Vérifié' : 'Non vérifié'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteSeller(null)}
                  disabled={deleteMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteSeller.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/sellers')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: SellersPage,
})
