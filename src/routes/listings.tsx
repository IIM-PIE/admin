import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { authService } from '@/services/auth.service'

/**
 * Layout parent pour toutes les routes /listings/*.
 * Le contenu de la page /listings (liste des annonces) est dans listings.index.tsx.
 * Le détail /listings/$id est rendu ici via <Outlet />.
 *
 * beforeLoad : protège l'accès admin/agent (redirect vers / sinon).
 */
function ListingsLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/listings')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ListingsLayout,
})
