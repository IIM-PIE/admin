import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { authService } from '@/services/auth.service'

function ReservationsLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/reservations')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ReservationsLayout,
})
