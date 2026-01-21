import { Link } from '@tanstack/react-router'
import { useAuth } from '@/contexts/auth-context'
import {
  LayoutDashboard,
  Users,
  Car,
  Store,
  MessageSquare,
  ClipboardList,
  BarChart3,
} from 'lucide-react'

export function Sidebar() {
  const { user } = useAuth()
  const role = user?.role
  const isAdmin = role === 'admin'
  const isAgent = role === 'agent' || isAdmin

  const menuItems = [
    {
      title: 'Vue d\'ensemble',
      items: [
        ...(isAdmin ? [{ icon: LayoutDashboard, label: 'Dashboard', href: '/' }] : []),
        ...(isAdmin ? [{ icon: BarChart3, label: 'Statistiques', href: '/statistics' }] : []),
      ],
    },
    {
      title: 'Gestion',
      items: [
        ...(isAdmin ? [{ icon: Users, label: 'Utilisateurs', href: '/users' }] : []),
        { icon: Car, label: 'Annonces', href: '/listings' },
        ...(isAdmin ? [{ icon: Store, label: 'Vendeurs', href: '/sellers' }] : []),
        ...(isAgent
          ? [
              { icon: ClipboardList, label: 'Réservations', href: '/quotes' },
              { icon: MessageSquare, label: 'Conversations', href: '/conversations' },
            ]
          : []),
      ],
    },
  ]

  return (
    <div className="pb-12 w-64 border-r bg-muted/40">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-6 px-4">
            <h2 className="text-2xl font-bold tracking-tight">Auto Import Italia</h2>
          </div>
          <div className="space-y-6">
            {menuItems
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <div key={section.title}>
                  <h3 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                        activeProps={{
                          className: 'bg-accent text-accent-foreground'
                        }}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
