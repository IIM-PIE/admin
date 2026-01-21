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
import { Search, Plus, MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { vehiclesService } from "@/services/vehicles.service";
import { sellersService } from "@/services/sellers.service";
import type { FuelType, Transmission, VehicleStatus, Vehicle } from "@/types";
import { useEffect, useState } from "react";

const MAX_IMAGES = 4;
const sanitizeNumberInput = (value: string) => value.replace(/\D/g, "");

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

// Composant formulaire d'ajout de véhicule
function AddVehicleForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [equipment, setEquipment] = useState<string[]>([]);
  const [currentEquipment, setCurrentEquipment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState("");

  const [formData, setFormData] = useState({
    sellerId: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    price: 0,
    importCost: 0,
    mileage: 0,
    fuelType: "essence" as FuelType,
    transmission: "manuelle" as Transmission,
    power: "",
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

  const createMutation = useMutation({
    mutationFn: vehiclesService.createVehicle,
    onSuccess: () => {
      toast.success("Véhicule créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
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

    const vehicleData = {
      ...formData,
      equipment,
      images,
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

  const isFormValid =
    formData.brand.trim() !== "" &&
    formData.model.trim() !== "" &&
    formData.sellerId !== "" &&
    formData.location.trim() !== "" &&
    formData.year > 1900 &&
    formData.price > 0 &&
    formData.mileage >= 0;

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
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                year: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            value={formData.mileage}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                mileage: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            step="100"
            value={formData.price}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                price: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            step="100"
            value={formData.importCost}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                importCost: sanitized ? parseInt(sanitized, 10) : 0,
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
            setFormData({ ...formData, status: value })
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description détaillée du véhicule..."
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
            {images.map((url, index) => (
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
          {createMutation.isPending ? "Création..." : "Créer le véhicule"}
        </Button>
      </div>
    </form>
  );
}

// Composant formulaire d'édition de véhicule
function EditVehicleForm({
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
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    year: vehicle.year || new Date().getFullYear(),
    price: vehicle.price || 0,
    importCost: vehicle.importCost || 0,
    mileage: vehicle.mileage || 0,
    fuelType: (vehicle.fuelType || "essence") as FuelType,
    transmission: (vehicle.transmission || "manuelle") as Transmission,
    power: vehicle.power || "",
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

  useEffect(() => {
    setEquipment(vehicle.equipment || []);
    setImages(vehicle.images || []);
    setFormData({
      sellerId: vehicle.sellerId || "",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      year: vehicle.year || new Date().getFullYear(),
      price: vehicle.price || 0,
      importCost: vehicle.importCost || 0,
      mileage: vehicle.mileage || 0,
      fuelType: (vehicle.fuelType || "essence") as FuelType,
      transmission: (vehicle.transmission || "manuelle") as Transmission,
      power: vehicle.power || "",
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
      vehiclesService.updateVehicle(vehicle.id, payload),
    onSuccess: () => {
      toast.success("Véhicule mis à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
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

    const vehicleData = {
      ...formData,
      equipment,
      images,
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

  const isFormValid =
    formData.brand.trim() !== "" &&
    formData.model.trim() !== "" &&
    formData.sellerId !== "" &&
    formData.location.trim() !== "" &&
    formData.year > 1900 &&
    formData.price > 0 &&
    formData.mileage >= 0;

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
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
            value={formData.year}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                year: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            value={formData.mileage}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                mileage: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            step="100"
            value={formData.price}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                price: sanitized ? parseInt(sanitized, 10) : 0,
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
            type="number"
            min="0"
            step="100"
            value={formData.importCost}
            inputMode="numeric"
            pattern="[0-9]*"
            onChange={(e) => {
              const sanitized = sanitizeNumberInput(e.target.value);
              setFormData({
                ...formData,
                importCost: sanitized ? parseInt(sanitized, 10) : 0,
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
            setFormData({ ...formData, status: value })
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

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description_edit">Description</Label>
        <Textarea
          id="description_edit"
          placeholder="Description détaillée du véhicule..."
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
            {images.map((url, index) => (
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

function VehiclesPage() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [statusVehicle, setStatusVehicle] = useState<Vehicle | null>(null);
  const [newStatus, setNewStatus] = useState<VehicleStatus>("available");
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data: vehicles,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["vehicles", debouncedSearch],
    queryFn: () =>
      vehiclesService.getVehicles({
        status: "all",
        page: 1,
        limit: 1000,
        search: debouncedSearch || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: vehiclesService.deleteVehicle,
    onSuccess: () => {
      toast.success("Véhicule supprimé avec succès");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setDeleteVehicle(null);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Erreur lors de la suppression"
      );
    },
  });

  const availableCount =
    vehicles?.filter((v) => v.status === "available").length || 0;
  const reservedCount =
    vehicles?.filter((v) => v.status === "reserved").length || 0;
  const soldCount = vehicles?.filter((v) => v.status === "sold").length || 0;

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: VehicleStatus }) =>
      vehiclesService.updateVehicle(payload.id, { status: payload.status }),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setStatusVehicle(null);
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
              Erreur lors du chargement des véhicules
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
              <div className="text-2xl font-bold">{vehicles?.length || 0}</div>
              <p className="text-xs text-muted-foreground">véhicules</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableCount}</div>
              <p className="text-xs text-muted-foreground">en vente</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Réservés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reservedCount}</div>
              <p className="text-xs text-muted-foreground">en cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{soldCount}</div>
              <p className="text-xs text-muted-foreground">ce mois</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="flex flex-col gap-2">
              <CardTitle>Catalogue de véhicules</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Chargement..."
                  : `${vehicles?.length || 0} véhicules au total`}
              </CardDescription>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un véhicule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Ajouter un véhicule</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau véhicule au catalogue.
                  </DialogDescription>
                </DialogHeader>
                <AddVehicleForm onClose={() => setIsAddDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par marque, modèle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    Chargement des véhicules...
                  </p>
                </div>
              </div>
            ) : vehicles && vehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Véhicule</TableHead>
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
                              onSelect={() => setEditingVehicle(vehicle)}
                            >
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setStatusVehicle(vehicle);
                                setNewStatus(vehicle.status);
                              }}
                            >
                              Changer le statut
                            </DropdownMenuItem>
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
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucun véhicule trouvé</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez votre premier véhicule au catalogue
                </p>
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
                Détails complets du véhicule sélectionné.
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
                              className="flex items-center justify-between rounded border px-3 py-2"
                            >
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-medium">{value}</span>
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
              <DialogTitle>Modifier le véhicule</DialogTitle>
              <DialogDescription>
                Mettez à jour les informations de {editingVehicle.brand}{" "}
                {editingVehicle.model}.
              </DialogDescription>
            </DialogHeader>
            <EditVehicleForm
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
                  onValueChange={(value: VehicleStatus) => setNewStatus(value)}
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
                  onClick={() =>
                    statusMutation.mutate({
                      id: statusVehicle.id,
                      status: newStatus,
                    })
                  }
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
              <DialogTitle>Supprimer le véhicule</DialogTitle>
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
    </DashboardLayout>
  );
}

export const Route = createFileRoute("/vehicles")({
  component: VehiclesPage,
});
