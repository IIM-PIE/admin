// User types
export type UserRole = 'customer' | 'admin' | 'agent'

export interface User {
  id: string
  email: string
  name: string
  phone?: string
  address?: string
  role: UserRole
  isVerified: boolean
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

// Vehicle types
export type FuelType = 'essence' | 'diesel' | 'hybride' | 'electrique'
export type Transmission = 'manuelle' | 'automatique'
export type VehicleStatus = 'available' | 'reserved' | 'sold'

export interface ListingStats {
  total: number
  available: number
  reserved: number
  sold: number
}

export interface ListingFilterOptions {
  brands: string[]
  locations: string[]
  sellers: Array<{
    id: string
    name: string
  }>
}

export interface Vehicle {
  id: string
  sellerId: string
  brand: string
  model: string
  year: number
  price: number
  importCost: number
  mileage: number
  fuelType: FuelType
  transmission: Transmission
  power?: string
  engineDisplacement?: number
  engineType?: string
  acceleration?: number
  topSpeed?: number
  consumption?: number
  co2?: number
  location: string
  description?: string
  equipment: string[]
  technicalData: Record<string, string>
  images: string[]
  sellerType: 'particulier' | 'professionnel'
  status: VehicleStatus
  createdAt: string
  updatedAt: string
  seller?: Seller
}

// Seller types
export interface Seller {
  id: string
  name: string
  type: 'particulier' | 'professionnel'
  location: string
  phone?: string
  email?: string
  rating: number
  verified: boolean
  createdAt: string
  updatedAt: string
}

// Quote types
export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export interface Quote {
  id: string
  userId: string
  vehicleId?: string
  externalListingId?: string
  vehicleDescription: string
  vehiclePrice: number
  importCost: number
  totalCost: number
  includedServices: string[]
  validUntil: string
  status: QuoteStatus
  acceptedAt?: string
  createdAt: string
  updatedAt: string
  user?: User
  vehicle?: Vehicle
}

// Import types
export type ImportStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface ImportStep {
  id: string
  importId: string
  stepNumber: number
  title: string
  description?: string
  status: 'pending' | 'active' | 'completed'
  startedAt?: string
  completedAt?: string
  details?: string
}

export interface Import {
  id: string
  userId: string
  quoteId: string
  vehicleDescription: string
  currentStep: number
  status: ImportStatus
  purchaseDate?: string
  estimatedDelivery?: string
  actualDelivery?: string
  trackingInfo?: Record<string, any>
  createdAt: string
  updatedAt: string
  user?: User
  quote?: Quote
  steps?: ImportStep[]
  documents?: Document[]
}

// External Listing types
export type ExternalListingStatus = 'pending' | 'analyzing' | 'quoted' | 'rejected'

export interface ExternalListing {
  id: string
  userId: string
  url: string
  price?: number
  location?: string
  sellerName?: string
  status: ExternalListingStatus
  notes?: string
  createdAt: string
  updatedAt: string
  user?: User
}

// Document types
export type DocumentType =
  | 'carte_identite'
  | 'justificatif_domicile'
  | 'carte_grise_italienne'
  | 'acte_vente'
  | 'facture'
  | 'quitus_fiscal'
  | 'certificat_conformite'
  | 'controle_technique_fr'
  | 'immatriculation_fr'
  | 'other'

export type DocumentCategory = 'user_uploaded' | 'admin_provided'
export type DocumentStatus = 'pending' | 'validated' | 'rejected'

export interface Document {
  id: string
  importId: string
  userId: string
  name: string
  type: DocumentType
  category: DocumentCategory
  fileUrl: string
  fileSize?: number
  mimeType?: string
  status: DocumentStatus
  required: boolean
  uploadedAt: string
  validatedAt?: string
}

// Conversation types
export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderType: 'user' | 'admin'
  messageType: 'text' | 'quote' | 'document'
  content: string
  quoteData?: Record<string, any>
  isRead: boolean
  createdAt: string
  sender?: User
}

export interface Conversation {
  id: string
  userId: string
  importId?: string
  vehicleDescription?: string
  status: 'active' | 'closed'
  unreadCount: number
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
  user?: User
  messages?: Message[]
}

// Notification types
export type NotificationType =
  | 'quote_ready'
  | 'quote_accepted'
  | 'import_step_updated'
  | 'document_required'
  | 'document_validated'
  | 'message_received'
  | 'vehicle_available'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
  address?: string
}

export interface CreateUserAdminData {
  email: string
  password: string
  name: string
  phone: string
  role: UserRole
  address?: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
}
