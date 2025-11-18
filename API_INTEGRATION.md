# Guide d'intégration API

Ce document explique comment intégrer le backend NestJS avec l'interface admin.

## 📋 Prérequis

1. Le backend doit être lancé sur `http://localhost:3000`
2. Installer les dépendances pour les requêtes HTTP :

```bash
npm install @tanstack/react-query axios
```

## 🔧 Configuration de l'API client

### 1. Créer le client axios

Créer `src/lib/api-client.ts` :

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré, rediriger vers login
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

### 2. Configurer TanStack Query

Modifier `src/main.tsx` :

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
```

## 📊 Exemple : Page Utilisateurs

### Créer les services API

`src/services/users.service.ts` :

```typescript
import apiClient from '@/lib/api-client'

export interface User {
  id: string
  email: string
  name: string
  role: 'customer' | 'admin' | 'agent'
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export const usersService = {
  // Liste paginée
  getUsers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get<User[]>('/users', { params })
    return data
  },

  // Détails d'un utilisateur
  getUser: async (id: string) => {
    const { data } = await apiClient.get<User>(`/users/${id}`)
    return data
  },

  // Mettre à jour
  updateUser: async (id: string, updates: Partial<User>) => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, updates)
    return data
  },

  // Vérifier/dévérifier
  toggleVerification: async (id: string) => {
    const { data } = await apiClient.patch<User>(`/users/${id}/verify`)
    return data
  },

  // Supprimer
  deleteUser: async (id: string) => {
    await apiClient.delete(`/users/${id}`)
  },
}
```

### Utiliser dans le composant

Modifier `src/routes/users.tsx` :

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '@/services/users.service'

function UsersPage() {
  const queryClient = useQueryClient()

  // Récupérer la liste
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
  })

  // Mutation pour supprimer
  const deleteMutation = useMutation({
    mutationFn: usersService.deleteUser,
    onSuccess: () => {
      // Rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  // Mutation pour vérifier
  const verifyMutation = useMutation({
    mutationFn: usersService.toggleVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  if (isLoading) return <div>Chargement...</div>
  if (error) return <div>Erreur: {error.message}</div>

  return (
    <DashboardLayout>
      {/* Utiliser users au lieu de mockUsers */}
      <Table>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.id}>
              {/* ... */}
              <Button onClick={() => deleteMutation.mutate(user.id)}>
                Supprimer
              </Button>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardLayout>
  )
}
```

## 🔐 Authentification

### 1. Créer le service d'authentification

`src/services/auth.service.ts` :

```typescript
import apiClient from '@/lib/api-client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials)
    // Stocker le token
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return data
  },

  logout: async () => {
    await apiClient.post('/auth/logout')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  getCurrentUser: async () => {
    const { data } = await apiClient.get('/auth/me')
    return data
  },
}
```

### 2. Créer une page de login

`src/routes/login.tsx` :

```typescript
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      navigate({ to: '/' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Connexion Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
            </Button>
            {loginMutation.isError && (
              <p className="text-sm text-destructive">
                Identifiants incorrects
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})
```

## 📝 Services à créer

Pour chaque entité, créer un service similaire :

- ✅ `src/services/auth.service.ts`
- ✅ `src/services/users.service.ts`
- 🔄 `src/services/vehicles.service.ts`
- 🔄 `src/services/quotes.service.ts`
- 🔄 `src/services/imports.service.ts`
- 🔄 `src/services/sellers.service.ts`
- 🔄 `src/services/documents.service.ts`
- 🔄 `src/services/conversations.service.ts`
- 🔄 `src/services/notifications.service.ts`

## 🎯 Prochaines tâches

1. Installer `@tanstack/react-query` et `axios`
2. Créer `src/lib/api-client.ts`
3. Configurer TanStack Query dans `main.tsx`
4. Créer les services API pour chaque entité
5. Remplacer les données mock par les appels API
6. Implémenter l'authentification
7. Ajouter la gestion des erreurs
8. Ajouter les états de chargement
9. Implémenter la pagination
10. Ajouter les filtres et recherche

## 🔧 Variables d'environnement

Créer `.env` :

```env
VITE_API_URL=http://localhost:3000
```

Utiliser dans le code :

```typescript
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
})
```

## 📚 Ressources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Axios Docs](https://axios-http.com/docs/intro)
- [Backend API Docs](http://localhost:3000/docs) (Swagger)
