import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usersService } from "@/services/users.service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { getCountries, getCountryCallingCode } from 'react-phone-number-input/input';
import en from 'react-phone-number-input/locale/en.json';
import { getExampleNumber } from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

// Obtenir le drapeau emoji du pays
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Obtenir un placeholder d'exemple pour le pays
const getPhonePlaceholder = (countryCode: string): string => {
  try {
    const exampleNumber = getExampleNumber(countryCode as any, examples);
    if (exampleNumber) {
      // Retirer l'indicatif du pays pour n'afficher que le numéro national
      const nationalNumber = exampleNumber.formatNational();
      return nationalNumber;
    }
  } catch (e) {
    // Fallback si pas d'exemple disponible
  }
  return '612 34 56 78';
};

// Obtenir la longueur maximale du numéro pour un pays (sans l'indicatif)
const getMaxPhoneLength = (countryCode: string): number => {
  try {
    const exampleNumber = getExampleNumber(countryCode as any, examples);
    if (exampleNumber) {
      // Compter uniquement les chiffres du numéro national
      const nationalNumber = exampleNumber.nationalNumber;
      return nationalNumber.length;
    }
  } catch (e) {
    // Fallback
  }
  return 15; // Longueur max par défaut
};

// Fonction pour générer un mot de passe aléatoire
const generatePassword = (length: number = 10): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getRoleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return <Badge variant="destructive">Admin</Badge>;
    case "agent":
      return <Badge variant="warning">Agent</Badge>;
    case "customer":
      return <Badge variant="secondary">Client</Badge>;
    default:
      return <Badge>{role}</Badge>;
  }
};

// Composant formulaire d'ajout d'utilisateur
function AddUserForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState<string>("FR");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: generatePassword(Math.floor(Math.random() * 5) + 8), // 8-12 caractères
    role: "customer" as "customer" | "admin" | "agent",
    address: "",
  });

  // Obtenir l'indicatif du pays sélectionné
  const countryCode = selectedCountry ? `+${getCountryCallingCode(selectedCountry as any)}` : "";

  // Obtenir la longueur maximale pour le pays sélectionné
  const maxLength = getMaxPhoneLength(selectedCountry);

  // Mettre à jour le téléphone complet quand le pays ou le numéro change
  useEffect(() => {
    if (phoneNumber.trim()) {
      setFormData(prev => ({ ...prev, phone: countryCode + phoneNumber.replace(/\s/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, phone: "" }));
    }
  }, [selectedCountry, phoneNumber, countryCode]);

  // Validation de l'email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation du numéro de téléphone
  const isValidPhone = () => {
    // Vérifier qu'il y a au moins 6 chiffres et ne dépasse pas la longueur max du pays
    const numbers = phoneNumber.replace(/\D/g, '');
    return numbers.length >= 6 && numbers.length <= maxLength;
  };

  // Gérer la saisie du numéro (accepter uniquement les chiffres et espaces)
  const handlePhoneNumberChange = (value: string) => {
    // Accepter uniquement les chiffres et espaces
    const cleaned = value.replace(/[^\d\s]/g, '');
    // Compter uniquement les chiffres (sans espaces)
    const digitsOnly = cleaned.replace(/\D/g, '');

    // Limiter au nombre de chiffres autorisés pour le pays
    if (digitsOnly.length <= maxLength) {
      setPhoneNumber(cleaned);
    }
  };

  // Vérifier si tous les champs obligatoires sont remplis et valides
  const isFormValid = formData.name.trim() !== "" &&
                      isValidEmail(formData.email) &&
                      phoneNumber.trim() !== "" &&
                      isValidPhone() &&
                      formData.password.trim() !== "";

  const createMutation = useMutation({
    mutationFn: usersService.createUser,
    onSuccess: () => {
      toast.success("Utilisateur créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la création"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !phoneNumber || !formData.role) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(Math.floor(Math.random() * 5) + 8);
    setFormData({ ...formData, password: newPassword });
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    toast.success("Mot de passe copié dans le presse-papier");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Nom complet <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Jean Dupont"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={createMutation.isPending}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="jean.dupont@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={createMutation.isPending}
          required
          className={formData.email && !isValidEmail(formData.email) ? "border-destructive" : ""}
        />
        {formData.email && !isValidEmail(formData.email) && (
          <p className="text-xs text-destructive">
            Veuillez saisir une adresse email valide
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Numéro de téléphone <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedCountry}
            onValueChange={setSelectedCountry}
            disabled={createMutation.isPending}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue>
                <span className="flex items-center gap-1">
                  {/* <span>{getCountryFlag(selectedCountry)}</span> */}
                  <span>{countryCode}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {getCountries().map((country) => (
                <SelectItem key={country} value={country}>
                  <span className="flex items-center gap-2">
                    <span>{getCountryFlag(country)}</span>
                    <span className="font-medium">+{getCountryCallingCode(country)}</span>
                    <span className="text-muted-foreground">- {en[country]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="phone"
            type="tel"
            placeholder={getPhonePlaceholder(selectedCountry)}
            value={phoneNumber}
            onChange={(e) => handlePhoneNumberChange(e.target.value)}
            disabled={createMutation.isPending}
            required
            className="flex-1"
          />
        </div>
        {phoneNumber && !isValidPhone() && (
          <p className="text-xs text-destructive">
            Le numéro doit contenir entre 6 et {maxLength} chiffres pour ce pays
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {getCountryFlag(selectedCountry)} {(en as any)[selectedCountry]} ({countryCode}) - Saisissez le reste du numéro
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">
          Rôle <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as "customer" | "admin" | "agent" })}
          disabled={createMutation.isPending}
          required
        >
          <SelectTrigger id="role">
            <SelectValue placeholder="Sélectionnez un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Client</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresse (optionnel)</Label>
        <Input
          id="address"
          type="text"
          placeholder="123 Rue de la République, 75001 Paris"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          disabled={createMutation.isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          Mot de passe <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="password"
            type="text"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={createMutation.isPending}
            required
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGeneratePassword}
            disabled={createMutation.isPending}
            title="Générer un nouveau mot de passe"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopyPassword}
            disabled={createMutation.isPending}
            title="Copier le mot de passe"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Le mot de passe est généré automatiquement (8-12 caractères).
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
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
          {createMutation.isPending ? "Création..." : "Créer l'utilisateur"}
        </Button>
      </div>
    </form>
  );
}

// Composant formulaire de modification d'utilisateur
function EditUserForm({ user, onClose }: { user: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState<string>("FR");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role || "customer" as "customer" | "admin" | "agent",
    address: user.address || "",
  });

  // Initialiser le pays et le numéro à partir du téléphone existant
  useEffect(() => {
    if (user.phone) {
      // Essayer de détecter le pays depuis le numéro
      const phoneStr = user.phone;
      const countries = getCountries();

      for (const country of countries) {
        const code = `+${getCountryCallingCode(country as any)}`;
        if (phoneStr.startsWith(code)) {
          setSelectedCountry(country);
          // Extraire le reste du numéro
          const restOfNumber = phoneStr.substring(code.length);
          setPhoneNumber(restOfNumber);
          break;
        }
      }
    }
  }, [user.phone]);

  const countryCode = selectedCountry ? `+${getCountryCallingCode(selectedCountry as any)}` : "";
  const maxLength = getMaxPhoneLength(selectedCountry);

  useEffect(() => {
    if (phoneNumber.trim()) {
      setFormData(prev => ({ ...prev, phone: countryCode + phoneNumber.replace(/\s/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, phone: "" }));
    }
  }, [selectedCountry, phoneNumber, countryCode]);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = () => {
    const numbers = phoneNumber.replace(/\D/g, '');
    return numbers.length >= 6 && numbers.length <= maxLength;
  };

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s]/g, '');
    const digitsOnly = cleaned.replace(/\D/g, '');

    if (digitsOnly.length <= maxLength) {
      setPhoneNumber(cleaned);
    }
  };

  const isFormValid = formData.name.trim() !== "" &&
                      isValidEmail(formData.email) &&
                      phoneNumber.trim() !== "" &&
                      isValidPhone();

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersService.updateUser(user.id, data),
    onSuccess: () => {
      toast.success("Utilisateur modifié avec succès");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la modification"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !phoneNumber || !formData.role) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-name">
          Nom complet <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-name"
          placeholder="Jean Dupont"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          disabled={updateMutation.isPending}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit-email"
          type="email"
          placeholder="jean.dupont@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={updateMutation.isPending}
          required
          className={formData.email && !isValidEmail(formData.email) ? "border-destructive" : ""}
        />
        {formData.email && !isValidEmail(formData.email) && (
          <p className="text-xs text-destructive">
            Veuillez saisir une adresse email valide
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">
          Numéro de téléphone <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Select
            value={selectedCountry}
            onValueChange={setSelectedCountry}
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="w-[120px]">
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
                    <span className="font-medium">+{getCountryCallingCode(country)}</span>
                    <span className="text-muted-foreground">- {(en as any)[country]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            id="edit-phone"
            type="tel"
            placeholder={getPhonePlaceholder(selectedCountry)}
            value={phoneNumber}
            onChange={(e) => handlePhoneNumberChange(e.target.value)}
            disabled={updateMutation.isPending}
            required
            className="flex-1"
          />
        </div>
        {phoneNumber && !isValidPhone() && (
          <p className="text-xs text-destructive">
            Le numéro doit contenir entre 6 et {maxLength} chiffres pour ce pays
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {getCountryFlag(selectedCountry)} {(en as any)[selectedCountry]} ({countryCode}) - Saisissez le reste du numéro
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-role">
          Rôle <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.role}
          onValueChange={(value) => setFormData({ ...formData, role: value as "customer" | "admin" | "agent" })}
          disabled={updateMutation.isPending}
          required
        >
          <SelectTrigger id="edit-role">
            <SelectValue placeholder="Sélectionnez un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Client</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-address">Adresse (optionnel)</Label>
        <Input
          id="edit-address"
          type="text"
          placeholder="123 Rue de la République, 75001 Paris"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
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
          {updateMutation.isPending ? "Modification..." : "Modifier l'utilisateur"}
        </Button>
      </div>
    </form>
  );
}

function UsersPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Debounce pour la recherche - attend 500ms après que l'utilisateur arrête de taper
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Récupérer la liste des utilisateurs (avec une grande limite pour tout récupérer)
  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  });

  // Mutation pour supprimer un utilisateur
  const deleteMutation = useMutation({
    mutationFn: usersService.deleteUser,
    onSuccess: () => {
      toast.success("Utilisateur supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la suppression"
      );
    },
  });

  // Mutation pour vérifier/dévérifier un utilisateur
  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      usersService.toggleVerification(id, isVerified),
    onSuccess: (_, variables) => {
      const message = variables.isVerified
        ? "Utilisateur vérifié avec succès"
        : "Vérification retirée avec succès";
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la mise à jour"
      );
    },
  });

  // Filtrage des utilisateurs basé sur la recherche
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!debouncedSearchTerm.trim()) return users;

    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
    );
  }, [users, debouncedSearchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Réinitialiser la page quand la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">
              Erreur lors du chargement des utilisateurs
            </p>
            <p className="text-sm text-muted-foreground">
              {(error as any).response?.data?.message ||
                "Erreur de connexion au serveur"}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-2">
              <CardTitle>Liste des utilisateurs</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Chargement..."
                  : debouncedSearchTerm
                  ? `${filteredUsers.length} résultat${filteredUsers.length > 1 ? "s" : ""} trouvé${filteredUsers.length > 1 ? "s" : ""} sur ${users?.length || 0} utilisateurs`
                  : `${users?.length || 0} utilisateurs enregistrés - Page ${currentPage} sur ${totalPages}`}
              </CardDescription>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Ajouter un utilisateur</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau compte utilisateur pour la plateforme.
                  </DialogDescription>
                </DialogHeader>
                <AddUserForm onClose={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Modifier l'utilisateur</DialogTitle>
                  <DialogDescription>
                    Modifiez les informations de l'utilisateur.
                  </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                  <EditUserForm
                    user={selectedUser}
                    onClose={() => {
                      setIsEditDialogOpen(false);
                      setSelectedUser(null);
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Supprimer l'utilisateur</DialogTitle>
                  <DialogDescription>
                    Cette action est irréversible. Toutes les données associées à cet utilisateur seront définitivement supprimées.
                  </DialogDescription>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <p className="text-sm font-medium">
                        Vous êtes sur le point de supprimer :
                      </p>
                      <p className="text-sm mt-2">
                        <span className="font-semibold">{selectedUser.name}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDeleteDialogOpen(false);
                          setSelectedUser(null);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          deleteMutation.mutate(selectedUser.id);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou email..."
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
                  <p className="text-sm text-muted-foreground">
                    Chargement des utilisateurs...
                  </p>
                </div>
              </div>
            ) : paginatedUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Vérifié</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={
                                deleteMutation.isPending ||
                                verifyMutation.isPending
                              }
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                verifyMutation.mutate({
                                  id: user.id,
                                  isVerified: !user.isVerified,
                                })
                              }
                            >
                              {user.isVerified
                                ? "Retirer la vérification"
                                : "Vérifier"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
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
                    ? "Aucun utilisateur ne correspond à votre recherche"
                    : "Aucun utilisateur trouvé"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {debouncedSearchTerm
                    ? "Essayez avec un autre terme de recherche"
                    : "Commencez par créer un utilisateur"}
                </p>
              </div>
            )}

            {/* Pagination */}
            {filteredUsers.length > itemsPerPage && (
              <div className="flex items-center justify-end px-2 py-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/users")({
  component: UsersPage,
});
