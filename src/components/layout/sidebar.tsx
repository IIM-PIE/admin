import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Users,
  Car,
  Store,
} from 'lucide-react'

const menuItems = [
  {
    title: 'Vue d\'ensemble',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
    ]
  },
  {
    title: 'Gestion',
    items: [
      { icon: Users, label: 'Utilisateurs', href: '/users' },
      { icon: Car, label: 'Véhicules', href: '/vehicles' },
      { icon: Store, label: 'Vendeurs', href: '/sellers' },
    ]
  },
]

export function Sidebar() {
  return (
    <div className="pb-12 w-64 border-r bg-muted/40">
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="mb-6 px-4">
            <h2 className="text-2xl font-bold tracking-tight">Auto Import Italia</h2>
          </div>
          <div className="space-y-6">
            {menuItems.map((section) => (
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
