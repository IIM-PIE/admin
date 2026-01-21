import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { authService } from '@/services/auth.service'
import { usersService } from '@/services/users.service'
import { sellersService } from '@/services/sellers.service'
import { listingsService } from '@/services/listings.service'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from 'recharts'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'available':
      return <Badge variant="success">Disponible</Badge>
    case 'reserved':
      return <Badge variant="warning">Réservé</Badge>
    case 'sold':
      return <Badge variant="secondary">Vendu</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function StatisticsPage() {
  const [activeCategory, setActiveCategory] = useState<'global' | 'annonces' | 'ca' | 'reservations'>('global')
  const [annoncesPeriod, setAnnoncesPeriod] = useState<'year' | 'month' | 'day'>('month')
  const [annoncesYear, setAnnoncesYear] = useState<number>(new Date().getFullYear())
  const [annoncesMonth, setAnnoncesMonth] = useState<number>(new Date().getMonth() + 1)
  const [caPeriod, setCaPeriod] = useState<'year' | 'month' | 'day'>('month')
  const [caYear, setCaYear] = useState<number>(new Date().getFullYear())
  const [caMonth, setCaMonth] = useState<number>(new Date().getMonth() + 1)
  const { data: users } = useQuery({
    queryKey: ['users', { page: 1, limit: 1000 }],
    queryFn: () => usersService.getUsers({ page: 1, limit: 1000 }),
  })

  const { data: sellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => sellersService.getSellers({ page: 1, limit: 1000 }),
  })

  const { data: listingStats } = useQuery({
    queryKey: ['listings', 'stats'],
    queryFn: () => listingsService.getListingStats(),
  })

  const { data: recentListings } = useQuery({
    queryKey: ['listings', { page: 1, limit: 5 }],
    queryFn: () => listingsService.getListings({ page: 1, limit: 5, status: 'all' }),
  })

  const { data: reservedListings } = useQuery({
    queryKey: ['listings', { status: 'reserved', page: 1, limit: 5 }],
    queryFn: () => listingsService.getListings({ status: 'reserved', page: 1, limit: 5 }),
  })

  const { data: listingsForTrends } = useQuery({
    queryKey: ['listings', { page: 1, limit: 1000, status: 'all' }],
    queryFn: () => listingsService.getListings({ page: 1, limit: 1000, status: 'all' }),
  })

  const userCount = users?.length ?? 0
  const sellerCount = sellers?.length ?? 0
  const importRevenue = listingStats?.importRevenue ?? 0
  const totalListings = listingStats?.total ?? 0
  const availableCount = listingStats?.available ?? 0
  const reservedCount = listingStats?.reserved ?? 0
  const soldCount = listingStats?.sold ?? 0
  const reservationRate = totalListings ? Math.round((reservedCount / totalListings) * 100) : 0
  const soldRate = totalListings ? Math.round((soldCount / totalListings) * 100) : 0
  const importAverage = soldCount ? Math.round(importRevenue / soldCount) : 0

  const statusData = [
    { status: 'Disponible', value: listingStats?.available ?? 0, key: 'available' },
    { status: 'Réservé', value: listingStats?.reserved ?? 0, key: 'reserved' },
    { status: 'Vendu', value: listingStats?.sold ?? 0, key: 'sold' },
  ]

  const monthOptions = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
  ]

  const yearOptions = useMemo(() => {
    const years = new Set<number>()
    ;(listingsForTrends?.data || []).forEach((listing) => {
      years.add(new Date(listing.createdAt).getFullYear())
    })
    const sorted = Array.from(years).sort((a, b) => a - b)
    return sorted.length ? sorted : [new Date().getFullYear()]
  }, [listingsForTrends])

  useEffect(() => {
    if (!yearOptions.includes(annoncesYear)) {
      setAnnoncesYear(yearOptions[yearOptions.length - 1])
    }
    if (!yearOptions.includes(caYear)) {
      setCaYear(yearOptions[yearOptions.length - 1])
    }
  }, [yearOptions, annoncesYear, caYear])

  const listingsTrendData = useMemo(() => {
    const listings = listingsForTrends?.data || []
    if (!listings.length) return []

    if (annoncesPeriod === 'year') {
      const map = new Map<number, number>()
      listings.forEach((listing) => {
        const year = new Date(listing.createdAt).getFullYear()
        map.set(year, (map.get(year) || 0) + 1)
      })
      return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, value]) => ({ label: String(year), value }))
    }

    if (annoncesPeriod === 'month') {
      const map = new Map<number, number>()
      for (let i = 1; i <= 12; i += 1) map.set(i, 0)
      listings.forEach((listing) => {
        const created = new Date(listing.createdAt)
        if (created.getFullYear() !== annoncesYear) return
        const month = created.getMonth() + 1
        map.set(month, (map.get(month) || 0) + 1)
      })
      return Array.from(map.entries()).map(([month, value]) => ({
        label: monthOptions[month - 1].label,
        value,
      }))
    }

    const daysInMonth = new Date(annoncesYear, annoncesMonth, 0).getDate()
    const map = new Map<number, number>()
    for (let i = 1; i <= daysInMonth; i += 1) map.set(i, 0)
    listings.forEach((listing) => {
      const created = new Date(listing.createdAt)
      if (created.getFullYear() !== annoncesYear) return
      if (created.getMonth() + 1 !== annoncesMonth) return
      const day = created.getDate()
      map.set(day, (map.get(day) || 0) + 1)
    })
    return Array.from(map.entries()).map(([day, value]) => ({
      label: String(day),
      value,
    }))
  }, [listingsForTrends, annoncesPeriod, annoncesYear, annoncesMonth, monthOptions])

  const importRevenueTrendData = useMemo(() => {
    const listings = listingsForTrends?.data || []
    if (!listings.length) return []

    if (caPeriod === 'year') {
      const map = new Map<number, number>()
      listings.forEach((listing) => {
        if (listing.status !== 'sold') return
        const year = new Date(listing.createdAt).getFullYear()
        map.set(year, (map.get(year) || 0) + Number(listing.importCost))
      })
      return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, value]) => ({ label: String(year), value }))
    }

    if (caPeriod === 'month') {
      const map = new Map<number, number>()
      for (let i = 1; i <= 12; i += 1) map.set(i, 0)
      listings.forEach((listing) => {
        if (listing.status !== 'sold') return
        const created = new Date(listing.createdAt)
        if (created.getFullYear() !== caYear) return
        const month = created.getMonth() + 1
        map.set(month, (map.get(month) || 0) + Number(listing.importCost))
      })
      return Array.from(map.entries()).map(([month, value]) => ({
        label: monthOptions[month - 1].label,
        value,
      }))
    }

    const daysInMonth = new Date(caYear, caMonth, 0).getDate()
    const map = new Map<number, number>()
    for (let i = 1; i <= daysInMonth; i += 1) map.set(i, 0)
    listings.forEach((listing) => {
      if (listing.status !== 'sold') return
      const created = new Date(listing.createdAt)
      if (created.getFullYear() !== caYear) return
      if (created.getMonth() + 1 !== caMonth) return
      const day = created.getDate()
      map.set(day, (map.get(day) || 0) + Number(listing.importCost))
    })
    return Array.from(map.entries()).map(([day, value]) => ({
      label: String(day),
      value,
    }))
  }, [listingsForTrends, caPeriod, caYear, caMonth, monthOptions])

  const currentMonthImportRevenue = useMemo(() => {
    const listings = listingsForTrends?.data || []
    if (!listings.length) return 0
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    return listings.reduce((total, listing) => {
      if (listing.status !== 'sold') return total
      const created = new Date(listing.createdAt)
      if (created.getFullYear() !== currentYear) return total
      if (created.getMonth() + 1 !== currentMonth) return total
      return total + Number(listing.importCost)
    }, 0)
  }, [listingsForTrends])

  const currentMonthLabel = useMemo(() => {
    const now = new Date()
    return `${monthOptions[now.getMonth()].label} ${now.getFullYear()}`
  }, [monthOptions])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'global', label: 'Vue globale' },
            { id: 'annonces', label: 'Annonces' },
            { id: 'ca', label: 'CA' },
            { id: 'reservations', label: 'Réservations' },
          ].map((tag) => (
            <Button
              key={tag.id}
              type="button"
              variant={activeCategory === tag.id ? 'secondary' : 'outline'}
              size="sm"
              onClick={() =>
                setActiveCategory(tag.id as typeof activeCategory)
              }
            >
              {tag.label}
            </Button>
          ))}
        </div>

        {activeCategory === 'global' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Utilisateurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{userCount}</div>
                  <p className="text-xs text-muted-foreground">comptes créés</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vendeurs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{sellerCount}</div>
                  <p className="text-xs text-muted-foreground">vendeurs actifs</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Annonces totales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{totalListings}</div>
                  <p className="text-xs text-muted-foreground">annonces au total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{availableCount}</div>
                  <p className="text-xs text-muted-foreground">annonces disponibles</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Réservées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{reservedCount}</div>
                  <p className="text-xs text-muted-foreground">annonces réservées</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vendues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{soldCount}</div>
                  <p className="text-xs text-muted-foreground">annonces vendues</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Taux de réservation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{reservationRate}%</div>
                  <p className="text-xs text-muted-foreground">sur le stock total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Taux de vente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{soldRate}%</div>
                  <p className="text-xs text-muted-foreground">sur le stock total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CA import</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {importRevenue.toLocaleString('fr-FR')} €
                  </div>
                  <p className="text-xs text-muted-foreground">cumulé</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Import moyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {importAverage.toLocaleString('fr-FR')} €
                  </div>
                  <p className="text-xs text-muted-foreground">par annonce vendue</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeCategory === 'annonces' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Annonces vendues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{listingStats?.sold ?? 0}</div>
                  <p className="text-xs text-muted-foreground">ventes confirmées</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Prix moyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {(recentListings?.data.length
                      ? recentListings.data.reduce((sum, listing) => sum + Number(listing.price), 0) /
                        recentListings.data.length
                      : 0
                    ).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                  </div>
                  <p className="text-xs text-muted-foreground">sur les annonces récentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Répartition</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      available: { label: 'Disponible', color: 'hsl(var(--chart-1))' },
                      reserved: { label: 'Réservé', color: 'hsl(var(--chart-2))' },
                      sold: { label: 'Vendu', color: 'hsl(var(--chart-3))' },
                    }}
                  >
                    <BarChart data={statusData}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="status" tickLine={false} axisLine={false} />
                      <YAxis width={32} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={`var(--color-${entry.key})`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle>Évolution des annonces</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={annoncesPeriod}
                    onValueChange={(value) =>
                      setAnnoncesPeriod(value as 'year' | 'month' | 'day')
                    }
                  >
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="year">Année</SelectItem>
                      <SelectItem value="month">Mois</SelectItem>
                      <SelectItem value="day">Jour</SelectItem>
                    </SelectContent>
                  </Select>
                  {(annoncesPeriod === 'month' || annoncesPeriod === 'day') && (
                    <Select
                      value={String(annoncesYear)}
                      onValueChange={(value) => setAnnoncesYear(Number(value))}
                    >
                      <SelectTrigger className="h-9 w-[120px]">
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {annoncesPeriod === 'day' && (
                    <Select
                      value={String(annoncesMonth)}
                      onValueChange={(value) => setAnnoncesMonth(Number(value))}
                    >
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-56 w-full"
                  config={{
                    value: { label: 'Annonces', color: 'hsl(var(--chart-1))' },
                  }}
                >
                  <LineChart data={listingsTrendData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis width={32} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      dataKey="value"
                      type="monotone"
                      stroke="var(--color-value)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Annonces récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentListings && recentListings.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Annonce</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentListings.data.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell className="font-medium">
                            {listing.brand} {listing.model}
                          </TableCell>
                          <TableCell>{getStatusBadge(listing.status)}</TableCell>
                          <TableCell className="text-right">
                            {listing.price.toLocaleString('fr-FR')} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune annonce pour le moment.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeCategory === 'ca' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">CA import</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {currentMonthImportRevenue.toLocaleString('fr-FR')} €
                  </div>
                  <p className="text-xs text-muted-foreground">sur {currentMonthLabel}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Import moyen</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {listingStats?.sold
                      ? Math.round(importRevenue / listingStats.sold).toLocaleString('fr-FR')
                      : '0'} €
                  </div>
                  <p className="text-xs text-muted-foreground">par annonce vendue</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
                  <CardTitle>CA import</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={caPeriod}
                      onValueChange={(value) =>
                        setCaPeriod(value as 'year' | 'month' | 'day')
                      }
                    >
                      <SelectTrigger className="h-9 w-[140px]">
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Année</SelectItem>
                        <SelectItem value="month">Mois</SelectItem>
                        <SelectItem value="day">Jour</SelectItem>
                      </SelectContent>
                    </Select>
                    {(caPeriod === 'month' || caPeriod === 'day') && (
                      <Select
                        value={String(caYear)}
                        onValueChange={(value) => setCaYear(Number(value))}
                      >
                        <SelectTrigger className="h-9 w-[120px]">
                          <SelectValue placeholder="Année" />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {caPeriod === 'day' && (
                      <Select
                        value={String(caMonth)}
                        onValueChange={(value) => setCaMonth(Number(value))}
                      >
                        <SelectTrigger className="h-9 w-[140px]">
                          <SelectValue placeholder="Mois" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((month) => (
                            <SelectItem key={month.value} value={String(month.value)}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-56 w-full"
                    config={{
                      value: { label: 'CA import', color: 'hsl(var(--chart-4))' },
                    }}
                  >
                    <BarChart data={importRevenueTrendData} margin={{ left: 8, right: 12 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis width={44} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeCategory === 'reservations' && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Réservées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{listingStats?.reserved ?? 0}</div>
                  <p className="text-xs text-muted-foreground">annonces réservées</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Taux de réservation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {listingStats?.total
                      ? `${Math.round(((listingStats?.reserved ?? 0) / listingStats.total) * 100)}%`
                      : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground">annonces réservées</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Réservations récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {reservedListings && reservedListings.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Annonce</TableHead>
                        <TableHead>Vendeur</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservedListings.data.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell className="font-medium">
                            {listing.brand} {listing.model}
                          </TableCell>
                          <TableCell>
                            {listing.seller?.name || '—'}
                          </TableCell>
                          <TableCell>
                            {listing.reservedByUser?.name || listing.reservedByUser?.email || '—'}
                          </TableCell>
                          <TableCell>
                            {new Date(listing.reservedAt ?? listing.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-right">
                            {listing.price.toLocaleString('fr-FR')} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune réservation pour le moment.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export const Route = createFileRoute('/statistics')({
  beforeLoad: async () => {
    const user = await authService.getCurrentUser().catch(() => null)
    if (!user || user.role !== 'admin') {
      throw redirect({ to: '/' })
    }
  },
  component: StatisticsPage,
})
