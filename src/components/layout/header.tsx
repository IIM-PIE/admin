import { User } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouterState } from '@tanstack/react-router'

export function Header() {
  const { user, logout } = useAuth()
  const routerState = useRouterState()

  // Mapper les routes vers leurs titres
  const getPageTitle = (pathname: string): string => {
    const routes: Record<string, string> = {
      '/': 'Dashboard',
      '/users': 'Utilisateurs',
      '/vehicles': 'Véhicules',
      '/sellers': 'Vendeurs',
      '/statistics': 'Statistiques',
    }

    return routes[pathname] || 'Dashboard'
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>
      case 'agent':
        return <Badge variant="warning">Agent</Badge>
      default:
        return null
    }
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{getPageTitle(routerState.location.pathname)}</h1>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Utilisateur'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {user?.role && <div className="pt-1">{getRoleBadge(user.role)}</div>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={logout}
            >
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
