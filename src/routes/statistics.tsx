import { createFileRoute, redirect } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function StatisticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Statistiques</h2>
          <p className="text-muted-foreground">
            Statistiques et analyses de la plateforme
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tableau de bord statistique</CardTitle>
            <CardDescription>Page en cours de développement</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Cette page sera bientôt disponible.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/statistics')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: StatisticsPage,
})
