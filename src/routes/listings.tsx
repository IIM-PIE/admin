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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  MoreHorizontal,
  X,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listingsService } from "@/services/listings.service";
import { sellersService } from "@/services/sellers.service";
import { conversationsService } from "@/services/conversations.service";
import { usersService } from "@/services/users.service";
import type { FuelType, Transmission, VehicleStatus, Vehicle, Conversation } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const MAX_IMAGES = 4;
const sanitizeNumberInput = (value: string) => value.replace(/\D/g, "");
const sanitizeDecimalInput = (value: string) =>
  value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

const getStatusBadge = (status: string) => {
  switch (status) {
    case "available":
      return <Badge variant="success">Disponible</Badge>;
    case "reserved":
      return <Badge variant="warning">Réservé</Badge>;
    case "sold":
      return <Badge variant="secondary">Vendu</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

// Composant formulaire d'ajout d'annonce
export function AddAnnonceForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [equipment, setEquipment] = useState<string[]>([]);
  const [currentEquipment, setCurrentEquipment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState("");

  const [formData, setFormData] = useState({
    sellerId: "",
    reservedByUserId: "",
    brand: "",
    model: "",
    year: String(new Date().getFullYear()),
    price: "",
    importCost: "",
    mileage: "",
    fuelType: "essence" as FuelType,
    transmission: "manuelle" as Transmission,
    power: "",
    engineDisplacement: "",
    engineType: "",
    acceleration: "",
    topSpeed: "",
    consumption: "",
    co2: "",
    location: "",
    description: "",
    equipment: [] as string[],
    technicalData: {},
    images: [] as string[],
    sellerType: "particulier" as "particulier" | "professionnel",
    status: "available" as VehicleStatus,
  });

  // Récupérer la liste des vendeurs
  const { data: sellers, isLoading: loadingSellers } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => sellersService.getSellers({ page: 1, limit: 1000 }),
  });
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["users", { page: 1, limit: 1000 }],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  });
  const customerUsers = useMemo(
    () => (users || []).filter((user) => user.role === "customer"),
    [users]
  );

  const createMutation = useMutation({
    mutationFn: listingsService.createListing,
    onSuccess: () => {
      toast.success("Annonce créée avec succès");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
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
    if (!formData.brand || !formData.model || !formData.sellerId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (formData.status === "reserved" && !formData.reservedByUserId) {
      toast.error("Veuillez sélectionner le client ayant réservé l'annonce");
      return;
    }
    if (formData.status === "reserved" && !formData.reservedByUserId) {
      toast.error("Veuillez sélectionner le client ayant réservé l'annonce");
      return;
    }
    if (formData.status === "reserved" && !formData.reservedByUserId) {
      toast.error("Veuillez sélectionner le client ayant réservé l'annonce");
      return;
    }

    const yearValue = parseRequiredInt(formData.year);
    const priceValue = parseRequiredFloat(formData.price);
    const importCostValue = parseOptionalFloat(formData.importCost);
    const mileageValue = parseRequiredFloat(formData.mileage);

    if (
      yearValue === undefined ||
      priceValue === undefined ||
      mileageValue === undefined
    ) {
      toast.error("Veuillez renseigner des valeurs numériques valides");
      return;
    }

    const yearValue = parseRequiredInt(formData.year);
    const priceValue = parseRequiredFloat(formData.price);
    const importCostValue = parseOptionalFloat(formData.importCost);
    const mileageValue = parseRequiredFloat(formData.mileage);

    if (
      yearValue === undefined ||
      priceValue === undefined ||
      mileageValue === undefined
    ) {
      toast.error("Veuillez renseigner des valeurs numériques valides");
      return;
    }

    const vehicleData = {
      ...formData,
      year: yearValue,
      price: priceValue,
      importCost: importCostValue,
      mileage: mileageValue,
      equipment,
      images,
      engineDisplacement: parseOptionalInt(formData.engineDisplacement),
      acceleration: parseOptionalFloat(formData.acceleration),
      topSpeed: parseOptionalInt(formData.topSpeed),
      consumption: parseOptionalFloat(formData.consumption),
      co2: parseOptionalInt(formData.co2),
    };

    createMutation.mutate(vehicleData);
  };

  const addEquipment = () => {
    if (currentEquipment.trim()) {
      setEquipment([...equipment, currentEquipment.trim()]);
      setCurrentEquipment("");
    }
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const addImage = () => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }
    if (currentImage.trim()) {
      setImages([...images, currentImage.trim()]);
      setCurrentImage("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const parseOptionalInt = (value: string) =>
    value ? parseInt(value, 10) : undefined;
  const parseOptionalFloat = (value: string) =>
    value ? Number(value) : undefined;
  const parseRequiredInt = (value: string) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };
  const parseRequiredFloat = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const yearValue = parseRequiredInt(formData.year);
  const priceValue = parseRequiredFloat(formData.price);
  const mileageValue = parseRequiredFloat(formData.mileage);

  const isFormValid =
    formData.brand.trim() !== "" &&
    formData.model.trim() !== "" &&
    formData.sellerId !== "" &&
    formData.location.trim() !== "" &&
    yearValue !== undefined &&
    yearValue > 1900 &&
    priceValue !== undefined &&
    priceValue > 0 &&
    mileageValue !== undefined &&
    mileageValue >= 0 &&
    (formData.status !== "reserved" || !!formData.reservedByUserId);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 overflow-y-auto overflow-x-hidden px-2 pr-3"
      style={{ maxHeight: "calc(90vh - 180px)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Marque */}
        <div className="space-y-2">
          <Label htmlFor="brand">
            Marque <span className="text-destructive">*</span>
          </Label>
          <Input
            id="brand"
            placeholder="BMW"
            value={formData.brand}
            onChange={(e) =>
              setFormData({ ...formData, brand: e.target.value })
            }
            disabled={createMutation.isPending}
            required
          />
        </div>

        {/* Modèle */}
        <div className="space-y-2">
          <Label htmlFor="model">
            Modèle <span className="text-destructive">*</span>
          </Label>
          <Input
            id="model"
            placeholder="Série 3"
            value={formData.model}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            disabled={createMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Année */}
        <div className="space-y-2">
          <Label htmlFor="year">
            Année <span className="text-destructive">*</span>
          </Label>
          <Input
            id="year"
            type="text"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            inputMode="numeric"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                year: sanitized,
              });
            }}
            disabled={createMutation.isPending}
            required
          />
        </div>

        {/* Kilométrage */}
        <div className="space-y-2">
          <Label htmlFor="mileage">
            Kilométrage (km) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mileage"
            type="text"
            min="0"
            value={formData.mileage}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                mileage: sanitized,
              });
            }}
            disabled={createMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prix */}
        <div className="space-y-2">
          <Label htmlFor="price">
            Prix (€) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price"
            type="text"
            min="0"
            value={formData.price}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                price: sanitized,
              });
            }}
            disabled={createMutation.isPending}
            required
          />
        </div>

        {/* Coût d'import */}
        <div className="space-y-2">
          <Label htmlFor="importCost">
            Coût d'import (€) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="importCost"
            type="text"
            min="0"
            value={formData.importCost}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                importCost: sanitized,
              });
            }}
            disabled={createMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de carburant */}
        <div className="space-y-2">
          <Label htmlFor="fuelType">
            Carburant <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.fuelType}
            onValueChange={(value: FuelType) =>
              setFormData({ ...formData, fuelType: value })
            }
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="fuelType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="essence">Essence</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="hybride">Hybride</SelectItem>
              <SelectItem value="electrique">Électrique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transmission */}
        <div className="space-y-2">
          <Label htmlFor="transmission">
            Transmission <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.transmission}
            onValueChange={(value: Transmission) =>
              setFormData({ ...formData, transmission: value })
            }
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="transmission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manuelle">Manuelle</SelectItem>
              <SelectItem value="automatique">Automatique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Puissance */}
        <div className="space-y-2">
          <Label htmlFor="power">Puissance (CV)</Label>
          <Input
            id="power"
            placeholder="150 CV"
            value={formData.power}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({ ...formData, power: sanitized });
            }}
            disabled={createMutation.isPending}
          />
        </div>

        {/* Localisation */}
        <div className="space-y-2">
          <Label htmlFor="location">
            Localisation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="location"
            placeholder="Milan, Italie"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            disabled={createMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Données techniques
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="engineDisplacement">Cylindrée (cm³)</Label>
            <Input
              id="engineDisplacement"
              placeholder="1998"
              value={formData.engineDisplacement}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, engineDisplacement: sanitized });
              }}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="engineType">Moteur</Label>
            <Input
              id="engineType"
              placeholder="V6 biturbo"
              value={formData.engineType}
              onChange={(e) =>
                setFormData({ ...formData, engineType: e.target.value })
              }
              disabled={createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceleration">0-100 km/h (s)</Label>
            <Input
              id="acceleration"
              placeholder="5.8"
              value={formData.acceleration}
              inputMode="decimal"
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setFormData({ ...formData, acceleration: sanitized });
              }}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topSpeed">Vitesse max (km/h)</Label>
            <Input
              id="topSpeed"
              placeholder="240"
              value={formData.topSpeed}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, topSpeed: sanitized });
              }}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumption">Consommation (L/100km)</Label>
            <Input
              id="consumption"
              placeholder="6.5"
              value={formData.consumption}
              inputMode="decimal"
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setFormData({ ...formData, consumption: sanitized });
              }}
              disabled={createMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="co2">CO2 (g/km)</Label>
            <Input
              id="co2"
              placeholder="120"
              value={formData.co2}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, co2: sanitized });
              }}
              disabled={createMutation.isPending}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendeur */}
        <div className="space-y-2">
          <Label htmlFor="sellerId">
            Vendeur <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.sellerId}
            onValueChange={(value) =>
              setFormData({ ...formData, sellerId: value })
            }
            disabled={createMutation.isPending || loadingSellers}
          >
            <SelectTrigger id="sellerId">
              <SelectValue
                placeholder={
                  loadingSellers ? "Chargement..." : "Sélectionnez un vendeur"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sellers && sellers.length > 0 ? (
                sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name} ({seller.type})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-sellers" disabled>
                  Aucun vendeur disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Type de vendeur */}
        <div className="space-y-2">
          <Label htmlFor="sellerType">
            Type de vendeur <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.sellerType}
            onValueChange={(value: "particulier" | "professionnel") =>
              setFormData({ ...formData, sellerType: value })
            }
            disabled={createMutation.isPending}
          >
            <SelectTrigger id="sellerType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">Particulier</SelectItem>
              <SelectItem value="professionnel">Professionnel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statut */}
      <div className="space-y-2">
        <Label htmlFor="status">
          Statut <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.status}
          onValueChange={(value: VehicleStatus) =>
            setFormData({
              ...formData,
              status: value,
              reservedByUserId: value === "reserved" ? formData.reservedByUserId : "",
            })
          }
          disabled={createMutation.isPending}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="reserved">Réservé</SelectItem>
            <SelectItem value="sold">Vendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.status === "reserved" && (
        <div className="space-y-2">
          <Label htmlFor="reservedByUserId">
            Client réservé <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.reservedByUserId}
            onValueChange={(value: string) =>
              setFormData({ ...formData, reservedByUserId: value })
            }
            disabled={createMutation.isPending || loadingUsers}
          >
            <SelectTrigger id="reservedByUserId">
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              {customerUsers.length > 0 ? (
                customerUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-customers" disabled>
                  Aucun client disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description détaillée de l'annonce..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          disabled={createMutation.isPending}
          rows={3}
        />
      </div>

      {/* Équipements */}
      <div className="space-y-2">
        <Label htmlFor="equipment">Équipements</Label>
        <div className="flex gap-2">
          <Input
            id="equipment"
            placeholder="GPS, Climatisation..."
            value={currentEquipment}
            onChange={(e) => setCurrentEquipment(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), addEquipment())
            }
            disabled={createMutation.isPending}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addEquipment}
            disabled={createMutation.isPending || !currentEquipment.trim()}
          >
            Ajouter
          </Button>
        </div>
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {equipment.map((item, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {item}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeEquipment(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label htmlFor="images">Images (URLs) (max {MAX_IMAGES})</Label>
        <div className="flex gap-2">
          <Input
            id="images"
            placeholder="https://exemple.com/image.jpg"
            value={currentImage}
            onChange={(e) => setCurrentImage(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), addImage())
            }
            disabled={createMutation.isPending || images.length >= MAX_IMAGES}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addImage}
            disabled={
              createMutation.isPending ||
              !currentImage.trim() ||
              images.length >= MAX_IMAGES
            }
          >
            Ajouter
          </Button>
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((_, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="gap-1 max-w-[200px] truncate"
              >
                Image {index + 1}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeImage(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background border-t mt-6 -mx-1 px-1 py-4">
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
          {createMutation.isPending ? "Création..." : "Créer l'annonce"}
        </Button>
      </div>
    </form>
  );
}

// Composant formulaire d'édition d'annonce
function EditAnnonceForm({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [equipment, setEquipment] = useState<string[]>(vehicle.equipment || []);
  const [currentEquipment, setCurrentEquipment] = useState("");
  const [images, setImages] = useState<string[]>(vehicle.images || []);
  const [currentImage, setCurrentImage] = useState("");

  const [formData, setFormData] = useState({
    sellerId: vehicle.sellerId || "",
    reservedByUserId: vehicle.reservedByUserId || "",
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    year: vehicle.year?.toString() || "",
    price: vehicle.price?.toString() || "",
    importCost: vehicle.importCost?.toString() || "",
    mileage: vehicle.mileage?.toString() || "",
    fuelType: (vehicle.fuelType || "essence") as FuelType,
    transmission: (vehicle.transmission || "manuelle") as Transmission,
    power: vehicle.power || "",
    engineDisplacement: vehicle.engineDisplacement?.toString() || "",
    engineType: vehicle.engineType || "",
    acceleration: vehicle.acceleration?.toString() || "",
    topSpeed: vehicle.topSpeed?.toString() || "",
    consumption: vehicle.consumption?.toString() || "",
    co2: vehicle.co2?.toString() || "",
    location: vehicle.location || "",
    description: vehicle.description || "",
    equipment: vehicle.equipment || [],
    technicalData: vehicle.technicalData || {},
    images: vehicle.images || [],
    sellerType:
      vehicle.sellerType || ("particulier" as "particulier" | "professionnel"),
    status: (vehicle.status || "available") as VehicleStatus,
  });

  // Récupérer la liste des vendeurs
  const { data: sellers, isLoading: loadingSellers } = useQuery({
    queryKey: ["sellers"],
    queryFn: () => sellersService.getSellers({ page: 1, limit: 1000 }),
  });
  const { data: editUsers, isLoading: loadingEditUsers } = useQuery({
    queryKey: ["users", { page: 1, limit: 1000 }],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  });
  const editCustomerUsers = useMemo(
    () => (editUsers || []).filter((user) => user.role === "customer"),
    [editUsers]
  );

  useEffect(() => {
    setEquipment(vehicle.equipment || []);
    setImages(vehicle.images || []);
    setFormData({
      sellerId: vehicle.sellerId || "",
      reservedByUserId: vehicle.reservedByUserId || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      price: vehicle.price?.toString() || "",
      importCost: vehicle.importCost?.toString() || "",
      mileage: vehicle.mileage?.toString() || "",
      fuelType: (vehicle.fuelType || "essence") as FuelType,
      transmission: (vehicle.transmission || "manuelle") as Transmission,
      power: vehicle.power || "",
      engineDisplacement: vehicle.engineDisplacement?.toString() || "",
      engineType: vehicle.engineType || "",
      acceleration: vehicle.acceleration?.toString() || "",
      topSpeed: vehicle.topSpeed?.toString() || "",
      consumption: vehicle.consumption?.toString() || "",
      co2: vehicle.co2?.toString() || "",
      location: vehicle.location || "",
      description: vehicle.description || "",
      equipment: vehicle.equipment || [],
      technicalData: vehicle.technicalData || {},
      images: vehicle.images || [],
      sellerType:
        vehicle.sellerType ||
        ("particulier" as "particulier" | "professionnel"),
      status: (vehicle.status || "available") as VehicleStatus,
    });
  }, [vehicle]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Vehicle>) =>
      listingsService.updateListing(vehicle.id, payload),
    onSuccess: () => {
      toast.success("Annonce mise à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la mise à jour"
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.sellerId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const yearValue = parseRequiredInt(formData.year);
    const priceValue = parseRequiredFloat(formData.price);
    const importCostValue = parseRequiredFloat(formData.importCost);
    const mileageValue = parseRequiredFloat(formData.mileage);

    if (
      yearValue === undefined ||
      priceValue === undefined ||
      importCostValue === undefined ||
      mileageValue === undefined
    ) {
      toast.error("Veuillez renseigner des valeurs numériques valides");
      return;
    }

    const vehicleData = {
      ...formData,
      year: yearValue,
      price: priceValue,
      importCost: importCostValue,
      mileage: mileageValue,
      equipment,
      images,
      engineDisplacement: parseOptionalInt(formData.engineDisplacement),
      acceleration: parseOptionalFloat(formData.acceleration),
      topSpeed: parseOptionalInt(formData.topSpeed),
      consumption: parseOptionalFloat(formData.consumption),
      co2: parseOptionalInt(formData.co2),
    };

    updateMutation.mutate(vehicleData);
  };

  const addEquipment = () => {
    if (currentEquipment.trim()) {
      setEquipment([...equipment, currentEquipment.trim()]);
      setCurrentEquipment("");
    }
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const addImage = () => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }
    if (currentImage.trim()) {
      setImages([...images, currentImage.trim()]);
      setCurrentImage("");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const parseOptionalInt = (value: string) =>
    value ? parseInt(value, 10) : undefined;
  const parseOptionalFloat = (value: string) =>
    value ? Number(value) : undefined;
  const parseRequiredInt = (value: string) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  };
  const parseRequiredFloat = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const yearValue = parseRequiredInt(formData.year);
  const priceValue = parseRequiredFloat(formData.price);
  const mileageValue = parseRequiredFloat(formData.mileage);

  const isFormValid =
    formData.brand.trim() !== "" &&
    formData.model.trim() !== "" &&
    formData.sellerId !== "" &&
    formData.location.trim() !== "" &&
    yearValue !== undefined &&
    yearValue > 1900 &&
    priceValue !== undefined &&
    priceValue > 0 &&
    mileageValue !== undefined &&
    mileageValue >= 0 &&
    (formData.status !== "reserved" || !!formData.reservedByUserId);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 overflow-y-auto overflow-x-hidden px-2 pr-3"
      style={{ maxHeight: "calc(90vh - 180px)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Marque */}
        <div className="space-y-2">
          <Label htmlFor="brand_edit">
            Marque <span className="text-destructive">*</span>
          </Label>
          <Input
            id="brand_edit"
            placeholder="BMW"
            value={formData.brand}
            onChange={(e) =>
              setFormData({ ...formData, brand: e.target.value })
            }
            disabled={updateMutation.isPending}
            required
          />
        </div>

        {/* Modèle */}
        <div className="space-y-2">
          <Label htmlFor="model_edit">
            Modèle <span className="text-destructive">*</span>
          </Label>
          <Input
            id="model_edit"
            placeholder="Série 3"
            value={formData.model}
            onChange={(e) =>
              setFormData({ ...formData, model: e.target.value })
            }
            disabled={updateMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Année */}
        <div className="space-y-2">
          <Label htmlFor="year_edit">
            Année <span className="text-destructive">*</span>
          </Label>
          <Input
            id="year_edit"
            type="text"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            inputMode="numeric"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                year: sanitized,
              });
            }}
            disabled={updateMutation.isPending}
            required
          />
        </div>

        {/* Kilométrage */}
        <div className="space-y-2">
          <Label htmlFor="mileage_edit">
            Kilométrage (km) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="mileage_edit"
            type="text"
            min="0"
            value={formData.mileage}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                mileage: sanitized,
              });
            }}
            disabled={updateMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Prix */}
        <div className="space-y-2">
          <Label htmlFor="price_edit">
            Prix (€) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price_edit"
            type="text"
            min="0"
            value={formData.price}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                price: sanitized,
              });
            }}
            disabled={updateMutation.isPending}
            required
          />
        </div>

        {/* Coût import */}
        <div className="space-y-2">
          <Label htmlFor="importCost_edit">Coût import (€)</Label>
          <Input
            id="importCost_edit"
            type="text"
            min="0"
            value={formData.importCost}
            inputMode="decimal"
            onChange={(e) => {
              const sanitized = sanitizeDecimalInput(e.target.value);
              setFormData({
                ...formData,
                importCost: sanitized,
              });
            }}
            disabled={updateMutation.isPending}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Carburant */}
        <div className="space-y-2">
          <Label htmlFor="fuelType_edit">
            Type de carburant <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.fuelType}
            onValueChange={(value: FuelType) =>
              setFormData({ ...formData, fuelType: value })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="fuelType_edit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="essence">Essence</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="hybride">Hybride</SelectItem>
              <SelectItem value="electrique">Électrique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transmission */}
        <div className="space-y-2">
          <Label htmlFor="transmission_edit">
            Transmission <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.transmission}
            onValueChange={(value: Transmission) =>
              setFormData({ ...formData, transmission: value })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="transmission_edit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manuelle">Manuelle</SelectItem>
              <SelectItem value="automatique">Automatique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Puissance */}
        <div className="space-y-2">
          <Label htmlFor="power_edit">Puissance (CV)</Label>
          <Input
            id="power_edit"
            placeholder="150 CV"
            value={formData.power}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({ ...formData, power: sanitized });
            }}
            disabled={updateMutation.isPending}
          />
        </div>

        {/* Localisation */}
        <div className="space-y-2">
          <Label htmlFor="location_edit">
            Localisation <span className="text-destructive">*</span>
          </Label>
          <Input
            id="location_edit"
            placeholder="Milan, Italie"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            disabled={updateMutation.isPending}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Données techniques
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="engineDisplacement_edit">Cylindrée (cm³)</Label>
            <Input
              id="engineDisplacement_edit"
              placeholder="1998"
              value={formData.engineDisplacement}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, engineDisplacement: sanitized });
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="engineType_edit">Moteur</Label>
            <Input
              id="engineType_edit"
              placeholder="V6 biturbo"
              value={formData.engineType}
              onChange={(e) =>
                setFormData({ ...formData, engineType: e.target.value })
              }
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acceleration_edit">0-100 km/h (s)</Label>
            <Input
              id="acceleration_edit"
              placeholder="5.8"
              value={formData.acceleration}
              inputMode="decimal"
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setFormData({ ...formData, acceleration: sanitized });
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topSpeed_edit">Vitesse max (km/h)</Label>
            <Input
              id="topSpeed_edit"
              placeholder="240"
              value={formData.topSpeed}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, topSpeed: sanitized });
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consumption_edit">Consommation (L/100km)</Label>
            <Input
              id="consumption_edit"
              placeholder="6.5"
              value={formData.consumption}
              inputMode="decimal"
              onChange={(e) => {
                const sanitized = sanitizeDecimalInput(e.target.value);
                setFormData({ ...formData, consumption: sanitized });
              }}
              disabled={updateMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="co2_edit">CO2 (g/km)</Label>
            <Input
              id="co2_edit"
              placeholder="120"
              value={formData.co2}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => {
                const sanitized = sanitizeNumberInput(e.target.value);
                setFormData({ ...formData, co2: sanitized });
              }}
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendeur */}
        <div className="space-y-2">
          <Label htmlFor="sellerId_edit">
            Vendeur <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.sellerId}
            onValueChange={(value) =>
              setFormData({ ...formData, sellerId: value })
            }
            disabled={updateMutation.isPending || loadingSellers}
          >
            <SelectTrigger id="sellerId_edit">
              <SelectValue
                placeholder={
                  loadingSellers ? "Chargement..." : "Sélectionnez un vendeur"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {sellers && sellers.length > 0 ? (
                sellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    {seller.name} ({seller.type})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-sellers" disabled>
                  Aucun vendeur disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Type de vendeur */}
        <div className="space-y-2">
          <Label htmlFor="sellerType_edit">
            Type de vendeur <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.sellerType}
            onValueChange={(value: "particulier" | "professionnel") =>
              setFormData({ ...formData, sellerType: value })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger id="sellerType_edit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particulier">Particulier</SelectItem>
              <SelectItem value="professionnel">Professionnel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statut */}
      <div className="space-y-2">
        <Label htmlFor="status_edit">
          Statut <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.status}
          onValueChange={(value: VehicleStatus) =>
            setFormData({
              ...formData,
              status: value,
              reservedByUserId: value === "reserved" ? formData.reservedByUserId : "",
            })
          }
          disabled={updateMutation.isPending}
        >
          <SelectTrigger id="status_edit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Disponible</SelectItem>
            <SelectItem value="reserved">Réservé</SelectItem>
            <SelectItem value="sold">Vendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.status === "reserved" && (
        <div className="space-y-2">
          <Label htmlFor="reservedByUserId_edit">
            Client réservé <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.reservedByUserId}
            onValueChange={(value: string) =>
              setFormData({ ...formData, reservedByUserId: value })
            }
            disabled={updateMutation.isPending || loadingEditUsers}
          >
            <SelectTrigger id="reservedByUserId_edit">
              <SelectValue placeholder="Sélectionner un client" />
            </SelectTrigger>
            <SelectContent>
              {editCustomerUsers.length > 0 ? (
                editCustomerUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-customers" disabled>
                  Aucun client disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description_edit">Description</Label>
        <Textarea
          id="description_edit"
          placeholder="Description détaillée de l'annonce..."
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          disabled={updateMutation.isPending}
          rows={3}
        />
      </div>

      {/* Équipements */}
      <div className="space-y-2">
        <Label htmlFor="equipment_edit">Équipements</Label>
        <div className="flex gap-2">
          <Input
            id="equipment_edit"
            placeholder="GPS, Climatisation..."
            value={currentEquipment}
            onChange={(e) => setCurrentEquipment(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), addEquipment())
            }
            disabled={updateMutation.isPending}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addEquipment}
            disabled={updateMutation.isPending || !currentEquipment.trim()}
          >
            Ajouter
          </Button>
        </div>
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {equipment.map((item, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {item}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeEquipment(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label htmlFor="images_edit">Images (URLs) (max {MAX_IMAGES})</Label>
        <div className="flex gap-2">
          <Input
            id="images_edit"
            placeholder="https://exemple.com/image.jpg"
            value={currentImage}
            onChange={(e) => setCurrentImage(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" && (e.preventDefault(), addImage())
            }
            disabled={updateMutation.isPending || images.length >= MAX_IMAGES}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addImage}
            disabled={
              updateMutation.isPending ||
              !currentImage.trim() ||
              images.length >= MAX_IMAGES
            }
          >
            Ajouter
          </Button>
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((_, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="gap-1 max-w-[200px] truncate"
              >
                Image {index + 1}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeImage(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 sticky bottom-0 bg-background border-t mt-6 -mx-1 px-1 py-4">
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
          {updateMutation.isPending
            ? "Mise à jour..."
            : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}

// Composant pour afficher et gérer les conversations d'une annonce
function ListingConversationsDialog({ 
  listing, 
  onClose 
}: { 
  listing: Vehicle
  onClose: () => void 
}) {
  const queryClient = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messageContent, setMessageContent] = useState("")

  // Récupérer les conversations du listing
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', 'listing', listing.id],
    queryFn: () => conversationsService.getListingConversations(listing.id),
  })

  // Récupérer les messages de la conversation sélectionnée
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => conversationsService.getMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
  })

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      conversationsService.sendMessage({
        conversationId: selectedConversation!.id,
        content,
      }),
    onSuccess: () => {
      setMessageContent("")
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation?.id] })
      queryClient.invalidateQueries({ queryKey: ['conversations', 'listing', listing.id] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erreur lors de l'envoi du message")
    },
  })

  return (
    <Dialog open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Conversations - {listing.brand} {listing.model}
          </DialogTitle>
          <DialogDescription>
            Gérez les conversations liées à cette annonce
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-[300px,1fr] gap-4 overflow-hidden">
          {/* Liste des conversations */}
          <Card className="overflow-hidden flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Conversations ({conversations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Chargement...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Aucune conversation
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedConversation?.id === conv.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">
                          {conv.user?.name || 'Utilisateur'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessageAt 
                          ? new Date(conv.lastMessageAt).toLocaleDateString('fr-FR')
                          : new Date(conv.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages de la conversation sélectionnée */}
          <Card className="flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Conversation avec {selectedConversation.user?.name}
                  </CardTitle>
                  <CardDescription>
                    {selectedConversation.user?.email}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderType === 'admin' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.senderType === 'admin'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderType === 'admin'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(message.createdAt).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (messageContent.trim()) {
                        sendMessageMutation.mutate(messageContent.trim())
                      }
                    }}
                    className="flex gap-2"
                  >
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="min-h-[60px] flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!messageContent.trim() || sendMessageMutation.isPending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Sélectionnez une conversation</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ListingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [statusVehicle, setStatusVehicle] = useState<Vehicle | null>(null);
  const [newStatus, setNewStatus] = useState<VehicleStatus>("available");
  const [statusReservedByUserId, setStatusReservedByUserId] = useState("");
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [selectedListingForConversations, setSelectedListingForConversations] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    const saved = localStorage.getItem("listings_view_mode");
    return saved === "grid" ? "grid" : "list";
  });
  const [filters, setFilters] = useState<{
    status: VehicleStatus | "all";
    brand: string;
    fuelType: FuelType | "all";
    transmission: Transmission | "all";
    sellerId: string;
    location: string;
    minYear: string;
    maxYear: string;
    minPrice: string;
    maxPrice: string;
  }>({
    status: "all",
    brand: "all",
    fuelType: "all",
    transmission: "all",
    sellerId: "all",
    location: "all",
    minYear: "",
    maxYear: "",
    minPrice: "",
    maxPrice: "",
  });

  const { data: users } = useQuery({
    queryKey: ["users", { page: 1, limit: 1000 }],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  });
  const customerUsers = useMemo(
    () => (users || []).filter((user) => user.role === "customer"),
    [users]
  );

  useEffect(() => {
    localStorage.setItem("listings_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data: listingsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["listings", currentPage, itemsPerPage, debouncedSearch, filters],
    queryFn: () =>
      listingsService.getListings({
        status: filters.status,
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        brand: filters.brand !== "all" ? filters.brand : undefined,
        sellerId: filters.sellerId !== "all" ? filters.sellerId : undefined,
        location: filters.location !== "all" ? filters.location : undefined,
        fuelType: filters.fuelType !== "all" ? filters.fuelType : undefined,
        transmission:
          filters.transmission !== "all" ? filters.transmission : undefined,
        minYear: filters.minYear ? Number(filters.minYear) : undefined,
        maxYear: filters.maxYear ? Number(filters.maxYear) : undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      }),
  });
  const vehicles = listingsResponse?.data || [];
  const totalCount = listingsResponse?.meta?.total ?? vehicles.length;
  const totalPages = listingsResponse?.meta?.pages ?? 1;

  const { data: listingStats, isLoading: loadingListingStats } = useQuery({
    queryKey: ["listings", "stats"],
    queryFn: () => listingsService.getListingStats(),
  });
  const canChangeStatus = user?.role === "admin" || user?.role === "agent";

  const { data: filterOptions } = useQuery({
    queryKey: ["listings", "filter-options"],
    queryFn: () => listingsService.getListingFilterOptions(),
  });

  const brandOptions = filterOptions?.brands || [];
  const locationOptions = filterOptions?.locations || [];
  const sellerOptions = filterOptions?.sellers || [];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count += 1;
    if (filters.brand !== "all") count += 1;
    if (filters.fuelType !== "all") count += 1;
    if (filters.transmission !== "all") count += 1;
    if (filters.sellerId !== "all") count += 1;
    if (filters.location !== "all") count += 1;
    if (filters.minYear) count += 1;
    if (filters.maxYear) count += 1;
    if (filters.minPrice) count += 1;
    if (filters.maxPrice) count += 1;
    return count;
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters]);

  const deleteMutation = useMutation({
    mutationFn: listingsService.deleteListing,
    onSuccess: () => {
      toast.success("Annonce supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setDeleteVehicle(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la suppression"
      );
    },
  });

  const availableCount = listingStats?.available ?? 0;
  const reservedCount = listingStats?.reserved ?? 0;
  const soldCount = listingStats?.sold ?? 0;
  const totalListings = listingStats?.total ?? totalCount;
  const totalListingsDisplay = loadingListingStats ? "..." : totalListings;
  const availableCountDisplay = loadingListingStats ? "..." : availableCount;
  const reservedCountDisplay = loadingListingStats ? "..." : reservedCount;
  const soldCountDisplay = loadingListingStats ? "..." : soldCount;

  const technicalSpecs = useMemo(() => {
    if (!selectedVehicle) return [];
    const specs = [
      {
        label: "Cylindrée",
        value: selectedVehicle.engineDisplacement
          ? `${selectedVehicle.engineDisplacement} cm³`
          : undefined,
      },
      {
        label: "Moteur",
        value: selectedVehicle.engineType || undefined,
      },
      {
        label: "0-100 km/h",
        value: selectedVehicle.acceleration
          ? `${selectedVehicle.acceleration} s`
          : undefined,
      },
      {
        label: "Vitesse max",
        value: selectedVehicle.topSpeed
          ? `${selectedVehicle.topSpeed} km/h`
          : undefined,
      },
      {
        label: "Consommation",
        value: selectedVehicle.consumption
          ? `${selectedVehicle.consumption} L/100km`
          : undefined,
      },
      {
        label: "CO2",
        value: selectedVehicle.co2
          ? `${selectedVehicle.co2} g/km`
          : undefined,
      },
    ];
    return specs.filter(
      (item) =>
        item.value !== undefined && item.value !== null && item.value !== ""
    );
  }, [selectedVehicle]);

  const formatTechnicalLabel = (label: string) => {
    const map: Record<string, string> = {
      motor: "Moteur",
      doors: "Portes",
      moteur: "Moteur",
      portes: "Portes",
      cylindree: "Cylindrée",
    };
    return map[label] || label;
  };

  const statusMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      status: VehicleStatus;
      reservedByUserId?: string;
    }) =>
      listingsService.updateListing(payload.id, {
        status: payload.status,
        reservedByUserId: payload.reservedByUserId,
      }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setStatusVehicle(null);
      setStatusReservedByUserId("");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Erreur lors de la mise à jour du statut"
      );
    },
  });

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">
              Erreur lors du chargement des annonces
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalListingsDisplay}</div>
              <p className="text-xs text-muted-foreground">annonces</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableCountDisplay}</div>
              <p className="text-xs text-muted-foreground">en vente</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réservés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservedCountDisplay}</div>
              <p className="text-xs text-muted-foreground">en cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{soldCountDisplay}</div>
              <p className="text-xs text-muted-foreground">ce mois</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-2">
              <CardTitle>Catalogue d'annonces</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Chargement..."
                  : `${totalCount} annonces au total${totalPages > 1 ? ` - Page ${currentPage} sur ${totalPages}` : ""}`}
              </CardDescription>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une annonce
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Ajouter une annonce</DialogTitle>
                  <DialogDescription>
                    Ajoutez une nouvelle annonce au catalogue.
                  </DialogDescription>
                </DialogHeader>
                <AddAnnonceForm onClose={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative md:flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par marque, modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-2">
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button type="button" variant="outline">
                      Filtres
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-2 rounded-full px-2 py-0.5 text-xs"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[360px] sm:w-[420px]">
                    <SheetHeader>
                      <SheetTitle>Filtres</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          General
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select
                              value={filters.status}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  status: value as VehicleStatus | "all",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Statut" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Tous les statuts
                                </SelectItem>
                                <SelectItem value="available">
                                  Disponible
                                </SelectItem>
                                <SelectItem value="reserved">Réservé</SelectItem>
                                <SelectItem value="sold">Vendu</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Marque</Label>
                            <Select
                              value={filters.brand}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  brand: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Marque" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Toutes les marques
                                </SelectItem>
                                {brandOptions.map((brand) => (
                                  <SelectItem key={brand} value={brand}>
                                    {brand}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Vendeur</Label>
                            <Select
                              value={filters.sellerId}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  sellerId: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Vendeur" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Tous les vendeurs
                                </SelectItem>
                                {sellerOptions.map((seller) => (
                                  <SelectItem key={seller.id} value={seller.id}>
                                    {seller.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Localisation</Label>
                            <Select
                              value={filters.location}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  location: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Localisation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Toutes les localisations
                                </SelectItem>
                                {locationOptions.map((location) => (
                                  <SelectItem key={location} value={location}>
                                    {location}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Caracteristiques
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Carburant</Label>
                            <Select
                              value={filters.fuelType}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  fuelType: value as FuelType | "all",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Carburant" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">
                                  Tous les carburants
                                </SelectItem>
                                <SelectItem value="essence">Essence</SelectItem>
                                <SelectItem value="diesel">Diesel</SelectItem>
                                <SelectItem value="hybride">Hybride</SelectItem>
                                <SelectItem value="electrique">
                                  Électrique
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Transmission</Label>
                            <Select
                              value={filters.transmission}
                              onValueChange={(value) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  transmission: value as Transmission | "all",
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Transmission" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Toutes</SelectItem>
                                <SelectItem value="manuelle">
                                  Manuelle
                                </SelectItem>
                                <SelectItem value="automatique">
                                  Automatique
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Plages
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Année</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Min"
                                type="number"
                                value={filters.minYear}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    minYear: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                placeholder="Max"
                                type="number"
                                value={filters.maxYear}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    maxYear: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Prix</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                placeholder="Min"
                                type="number"
                                value={filters.minPrice}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    minPrice: e.target.value,
                                  }))
                                }
                              />
                              <Input
                                placeholder="Max"
                                type="number"
                                value={filters.maxPrice}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    maxPrice: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setFilters({
                              status: "all",
                              brand: "all",
                              fuelType: "all",
                              transmission: "all",
                              sellerId: "all",
                              location: "all",
                              minYear: "",
                              maxYear: "",
                              minPrice: "",
                              maxPrice: "",
                            })
                          }
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label="Afficher en liste"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  aria-label="Afficher en grille"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Chargement des annonces...
                  </p>
                </div>
              </div>
            ) : vehicles.length > 0 ? (
              viewMode === "list" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Annonce</TableHead>
                    <TableHead>Année</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Coût import</TableHead>
                    <TableHead>Kilométrage</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        {vehicle.brand} {vehicle.model}
                      </TableCell>
                      <TableCell>{vehicle.year}</TableCell>
                      <TableCell>
                        {vehicle.price.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {vehicle.importCost.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell>
                        {vehicle.mileage.toLocaleString("fr-FR")} km
                      </TableCell>
                      <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={deleteMutation.isPending}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => setSelectedVehicle(vehicle)}
                            >
                              Voir les détails
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setSelectedListingForConversations(vehicle)}
                              disabled={!vehicle._count?.conversations || vehicle._count.conversations === 0}
                              className={!vehicle._count?.conversations || vehicle._count.conversations === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              Voir les conversations
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setEditingVehicle(vehicle)}
                            >
                              Modifier
                            </DropdownMenuItem>
                            {canChangeStatus && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setStatusVehicle(vehicle);
                                  setNewStatus(vehicle.status);
                                  setStatusReservedByUserId(
                                    vehicle.reservedByUserId || ""
                                  );
                                }}
                              >
                                Changer le statut
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setDeleteVehicle(vehicle)}
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map((vehicle) => (
                    <Card key={vehicle.id} className="overflow-hidden">
                      <div className="aspect-[4/3] bg-muted/40">
                        {vehicle.images && vehicle.images.length > 0 ? (
                          <img
                            src={vehicle.images[0]}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Aucune image
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.year} ·{" "}
                              {vehicle.mileage.toLocaleString("fr-FR")} km
                            </p>
                          </div>
                          {getStatusBadge(vehicle.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Prix</p>
                            <p className="font-semibold">
                              {vehicle.price.toLocaleString("fr-FR")} €
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Coût import
                            </p>
                            <p className="font-semibold text-muted-foreground">
                              {vehicle.importCost.toLocaleString("fr-FR")} €
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={deleteMutation.isPending}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setSelectedVehicle(vehicle)}
                              >
                                Voir les détails
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setSelectedListingForConversations(vehicle)}
                                disabled={!vehicle._count?.conversations || vehicle._count.conversations === 0}
                                className={!vehicle._count?.conversations || vehicle._count.conversations === 0 ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                Voir les conversations
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setEditingVehicle(vehicle)}
                              >
                                Modifier
                              </DropdownMenuItem>
                            {canChangeStatus && (
                              <DropdownMenuItem
                                onSelect={() => {
                                  setStatusVehicle(vehicle);
                                  setNewStatus(vehicle.status);
                                  setStatusReservedByUserId(
                                    vehicle.reservedByUserId || ""
                                  );
                                }}
                              >
                                Changer le statut
                              </DropdownMenuItem>
                            )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setDeleteVehicle(vehicle)}
                              >
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune annonce trouvée</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez votre première annonce au catalogue
                </p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-end px-2 py-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

      <Dialog
        open={!!selectedVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVehicle(null);
            setSelectedImageIndex(0);
          }
        }}
      >
        {selectedVehicle && (
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex flex-col gap-1">
                <span className="text-sm font-normal text-muted-foreground">
                  {selectedVehicle.brand}
                </span>
                <span className="text-2xl font-semibold leading-tight">
                  {selectedVehicle.brand} {selectedVehicle.model} ·{" "}
                  {selectedVehicle.year}
                </span>
              </DialogTitle>
              <DialogDescription>
                Détails complets de l'annonce sélectionnée.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr] items-start">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-muted/50">
                  {selectedVehicle.images &&
                  selectedVehicle.images.length > 0 ? (
                    <img
                      src={
                        selectedVehicle.images[
                          Math.min(
                            selectedImageIndex,
                            selectedVehicle.images.length - 1
                          )
                        ]
                      }
                      alt={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                      Aucune image disponible
                    </div>
                  )}
                </div>

                {selectedVehicle.images &&
                  selectedVehicle.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedVehicle.images.map((url, index) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() => setSelectedImageIndex(index)}
                          className={`overflow-hidden rounded-md border bg-muted/50 transition ${
                            index === selectedImageIndex
                              ? "ring-2 ring-primary"
                              : "hover:ring-2 hover:ring-primary/50"
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
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(selectedVehicle.status)}
                  <Badge variant="outline">{selectedVehicle.fuelType}</Badge>
                  <Badge variant="outline">
                    {selectedVehicle.transmission}
                  </Badge>
                  <Badge variant="secondary">
                    {selectedVehicle.sellerType}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Prix</p>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.price.toLocaleString("fr-FR")} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Coût import</p>
                    <p className="text-lg font-semibold text-muted-foreground">
                      {selectedVehicle.importCost.toLocaleString("fr-FR")} €
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kilométrage</p>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.mileage.toLocaleString("fr-FR")} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Puissance</p>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.power || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Localisation
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedVehicle.location}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Créé le</p>
                    <p className="text-lg font-semibold">
                      {new Date(selectedVehicle.createdAt).toLocaleDateString(
                        "fr-FR"
                      )}
                    </p>
                  </div>
                </div>

                {selectedVehicle.description && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Description
                    </p>
                    <p className="leading-relaxed text-sm">
                      {selectedVehicle.description}
                    </p>
                  </div>
                )}

                {selectedVehicle.equipment &&
                  selectedVehicle.equipment.length > 0 && (
                    <div className="space-y-2 rounded-lg border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Équipements
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedVehicle.equipment.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {technicalSpecs.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Fiche technique
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {technicalSpecs.map((spec) => (
                        <div
                          key={spec.label}
                          className="rounded border px-3 py-2"
                        >
                          <p className="text-xs text-muted-foreground">
                            {spec.label}
                          </p>
                          <p className="font-medium">{spec.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVehicle.technicalData &&
                  Object.keys(selectedVehicle.technicalData).length > 0 && (
                    <div className="space-y-2 rounded-lg border p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Données techniques
                      </p>
                      <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                        {Object.entries(selectedVehicle.technicalData).map(
                          ([label, value]) => (
                            <div
                              key={label}
                              className="rounded border px-3 py-2"
                            >
                              <p className="text-xs text-muted-foreground">
                                {formatTechnicalLabel(label)}
                              </p>
                              <p className="font-medium">{value}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {selectedVehicle.seller && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Vendeur
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {selectedVehicle.seller.name}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedVehicle.seller.type === "professionnel"
                          ? "Professionnel"
                          : "Particulier"}{" "}
                        · {selectedVehicle.seller.location}
                      </p>
                      {(selectedVehicle.seller.phone ||
                        selectedVehicle.seller.email) && (
                        <p className="text-muted-foreground">
                          {[
                            selectedVehicle.seller.phone,
                            selectedVehicle.seller.email,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!editingVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVehicle(null);
          }
        }}
      >
        {editingVehicle && (
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Modifier l'annonce</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de {editingVehicle.brand}{" "}
                {editingVehicle.model}.
              </DialogDescription>
            </DialogHeader>
            <EditAnnonceForm
              vehicle={editingVehicle}
              onClose={() => setEditingVehicle(null)}
            />
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!statusVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setStatusVehicle(null);
            setStatusReservedByUserId("");
          }
        }}
      >
        {statusVehicle && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Changer le statut</DialogTitle>
              <DialogDescription>
                Mettre à jour le statut de {statusVehicle.brand}{" "}
                {statusVehicle.model}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status_select">Statut</Label>
                <Select
                  value={newStatus}
                  onValueChange={(value: VehicleStatus) => {
                    setNewStatus(value);
                    if (value !== "reserved") {
                      setStatusReservedByUserId("");
                    }
                  }}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger id="status_select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="reserved">Réservé</SelectItem>
                    <SelectItem value="sold">Vendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === "reserved" && (
                <div className="space-y-2">
                  <Label htmlFor="status_reserved_user">
                    Client réservé <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={statusReservedByUserId}
                    onValueChange={(value: string) =>
                      setStatusReservedByUserId(value)
                    }
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger id="status_reserved_user">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerUsers.length > 0 ? (
                        customerUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-customers" disabled>
                          Aucun client disponible
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStatusVehicle(null)}
                  disabled={statusMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (
                      newStatus === "reserved" &&
                      !statusReservedByUserId
                    ) {
                      toast.error(
                        "Veuillez sélectionner le client ayant réservé l'annonce"
                      );
                      return;
                    }
                    statusMutation.mutate({
                      id: statusVehicle.id,
                      status: newStatus,
                      reservedByUserId:
                        newStatus === "reserved"
                          ? statusReservedByUserId
                          : undefined,
                    });
                  }}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending ? "Mise à jour..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={!!deleteVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteVehicle(null);
          }
        }}
      >
        {deleteVehicle && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Supprimer l'annonce</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Confirmez la suppression de{" "}
                <span className="font-semibold">
                  {deleteVehicle.brand} {deleteVehicle.model}
                </span>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Année</span>
                  <span className="font-medium">{deleteVehicle.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix</span>
                  <span className="font-medium">
                    {deleteVehicle.price.toLocaleString("fr-FR")} €
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <span className="font-medium capitalize">
                    {deleteVehicle.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteVehicle(null)}
                  disabled={deleteMutation.isPending}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(deleteVehicle.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Dialog pour les conversations d'une annonce */}
      {selectedListingForConversations && (
        <ListingConversationsDialog
          listing={selectedListingForConversations}
          onClose={() => setSelectedListingForConversations(null)}
        />
      )}
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/listings")({
  component: ListingsPage,
});
