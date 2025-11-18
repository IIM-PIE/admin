import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: '/' })
    }
  }, [user, isLoading, navigate])

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Check if user has admin role
      if (data.user.role !== 'admin') {
        // Clear tokens if user is not admin
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        toast.error('Identifiants incorrects')
        return
      }
      toast.success(`Bienvenue ${data.user.name}!`)
      // Force a reload of the page to refresh the auth context
      window.location.href = '/'
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Identifiants incorrects'
      toast.error(message)
      console.error('Login error:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-[400px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">AutoImport Italia</CardTitle>
          <CardDescription>
            Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@autoimport.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
})
