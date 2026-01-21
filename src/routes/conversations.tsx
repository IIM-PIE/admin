import { createFileRoute, redirect } from '@tanstack/react-router'
import { authService } from '@/services/auth.service'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

function ConversationsPage() {
  return (
    <DashboardLayout>
      <div />
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/conversations')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      throw redirect({ to: '/' })
    }
  },
  component: ConversationsPage,
})
