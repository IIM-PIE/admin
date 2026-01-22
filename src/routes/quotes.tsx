import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { authService } from '@/services/auth.service'

function QuotesLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/quotes')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: QuotesLayout,
})
